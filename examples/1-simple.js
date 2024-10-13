/**
 * Create a simple Realm and execute JavaScript code
 */
const myRealm = Realm.makeRootRealm({});

const result = myRealm.evaluate('1 + 2');
console.log('Realm evaluation result:', result); // 3