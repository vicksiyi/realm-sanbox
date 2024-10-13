{
    const myRealm = Realm.makeRootRealm({});
    const result = myRealm.evaluate(`
        console.log('hello world');
    `);
    console.log('Access result:', result); // undefined
}