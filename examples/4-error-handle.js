{
    const myRealm = Realm.makeRootRealm({});
    myRealm.evaluate('throw new Error("Realm error!");');
}