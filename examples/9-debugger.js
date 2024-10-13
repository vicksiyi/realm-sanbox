{
    const myRealm = Realm.makeRootRealm({});
    const result = myRealm.evaluate(`
        debugger;
        function sum(num1, num2) {
            return num1 + num2;
        }

        sum(1,2);
    `);
    console.log('Access result:', result); // 3
}