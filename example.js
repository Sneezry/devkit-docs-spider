const spider = require('./index.js');

spider().then(res => {
    if (res === 0) {
        // success
    } else {
        // fail
    }
});

// Call as sync
// res = await spider();
// if (res === 0) {
//     // success
// } else {
//     // fail
// }