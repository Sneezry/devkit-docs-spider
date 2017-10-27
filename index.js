const cheerio = require('cheerio');
const request = require('then-request');
const url = require('url');
const Table = require('cli-table2');
const colors = require('colors/safe');

let urlList = [];
let results = [];
let errCrawlList = [];
let worker = 0;
let exludeList = ['www.linkedin.com', 'www.facebook.com', 'twitter.com', 'marketplace.visualstudio.com'];
let success = 0;
let fail = 0;
let ignore = 0;
let crawlFail = 0;

let wrapping = (str, length) => {
    
    if (!str || str.length <= length) {
        return str;
    }

    let _str = [];
    while(str.length > length) {
        _str.push(str.substr(0, length));
        str = str.substr(length);
    }

    _str.push(str);
    
    return _str.join('\n');
}

let spider = (entry, origin = null) => {
    if (!entry) {
        return;
    }

    entry = entry.trim();

    if (entry.indexOf('://') === -1) {
        if (entry.substr(0, 1) === '//') {
            entry = 'https:' + entry;
        } else if (entry.substr(0, 1) === '/') {
            entry = 'https://microsoft.github.io/azure-iot-developer-kit' + entry;
        } else {
            entry = 'https://microsoft.github.io/azure-iot-developer-kit/' + entry;
        }
    }

    if (entry.indexOf('http://microsoft.github.io/azure-iot-developer-kit') === 0) {
        entry = entry.replace('http://', 'https://');
    }
    
    entry = entry.split('#')[0];

    if(urlList.indexOf(entry) !== -1) {
        return;
    }

    urlList.push(entry);
    
    let hostname = url.parse(entry).hostname;
    
    if (exludeList.indexOf(hostname) !== -1) {
        console.log(`[Ignored] ${entry}`);
        results.push({
            url: entry,
            origin: origin,
            statusCode: 0,
            success: true,
            error: 'ignored'
        });

        ignore++;

        return;
    }

    console.log(`Checking ${entry}`);

    request('HEAD', entry, {gzip: false, headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'}}).then(res => {
        let statusCode = res.statusCode;

        console.log(`[${statusCode}] ${entry}`);

        if (statusCode >= 200 && statusCode < 400) {
            results.push({
                url: entry,
                origin: origin,
                statusCode: statusCode,
                success: true,
                error: null
            });

            success++;

            if (res.headers['content-type'].indexOf('text/html') !== -1 && hostname === 'microsoft.github.io') {
                request('GET', entry, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'}}).then(res => {
                    let body = res.getBody().toString();
                    $ = cheerio.load(body);
                    
                    links = $('a');
                    for (let i = 0; i < links.length; i++) {
                        let url = links[i].attribs.href;
                        spider(url, entry);
                    }
                    destoryWorker();
                }, err => {
                    errCrawlList.push({
                        url: entry,
                        error: err.message
                    });

                    crawlFail++;
                });
            } else {
                destoryWorker();
            }
        } else {
            results.push({
                url: entry,
                origin: origin,
                statusCode: statusCode,
                success: false,
                error: null
            });

            fail++;

            destoryWorker();
        }
    }, err => {
        console.log(`[ERR] ${entry}`);

        results.push({
            url: entry,
            origin: origin,
            statusCode: 0,
            success: false,
            error: err.message
        });

        fail++;
    });
}

let destoryWorker = () => {
    if (urlList.length === results.length) {
        console.log('Check Results:');
        let table = new Table({
            head: ['Success', 'Code', 'URL', 'Origin', 'Error']
          , colWidths: [9, 6, 50, 50, 25]
          , style: {
              head: ['cyan', 'cyan', 'cyan', 'cyan', 'cyan']
          }
        });

        results.sort((a, b) => {
            return b.statusCode - a.statusCode;
        })

        results.forEach(res => {
            table.push([(res.success ? colors.green('Yes') : colors.red('No')),
                res.statusCode, wrapping(res.url, 48), res.origin ? wrapping(res.origin, 48) : '', res.error ? wrapping(res.error, 23) : '']);
        });

        let tableString = table.toString();
        console.log(tableString);

        if (errCrawlList.length > 0) {
            console.log('Craw Failed List:');
            let table = new Table({
                head: ['URL', 'Error']
                , colWidths: [50, 25]
            });
    
            errCrawlList.forEach(res => {
                table.push([wrapping(res.url, 48), res.error ? wrapping(res.error, 23) : '']);
            });
    
            let tableString = table.toString();
            console.log(tableString);
        }

        console.log(`\n>>> Summary <<<\n\nCrawl ${colors.cyan(urlList.length)} URLs\n${colors.cyan(success)} success\n${colors.cyan(fail)} fail\n${colors.cyan(crawlFail)} craw fail\n${colors.cyan(ignore)} ignore`);
    }
}

spider('https://microsoft.github.io/azure-iot-developer-kit/');