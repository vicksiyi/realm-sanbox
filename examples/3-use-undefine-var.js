{
    const myRealm = Realm.makeRootRealm({});
    const result = myRealm.evaluate('undefinedVariable');
    console.log('Access result:', result); // undefined
}