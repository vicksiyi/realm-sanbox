{
    const myRealm = Realm.makeRootRealm({
        console
    });
    const result = myRealm.evaluate(`
        console.log('hello world');
    `, {
        console
    });
    console.log('Access result:', result); // undefined
}