{
    const myRealm = Realm.makeRootRealm({});
    // define
    const value = myRealm.evaluate(`
        // define
        const myVariable = "Hello from Realm";
        // use
        myVariable
    `);
    console.log(value); // "Hello from Realm"
}


// TODO:
/**
 * myRealm.evaluate('const myVariable = "Hello from Realm";');
 * const value = myRealm.evaluate('myVariable');
 */