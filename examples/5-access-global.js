{
    const myRealm = Realm.makeRootRealm({});
    const result = myRealm.evaluate('window');
    console.log('Access result:', result); // undefined


    console.log('Access own window:', window);
}