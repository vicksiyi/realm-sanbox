# Desc
Realm 是 JavaScript 中的一个高级概念，它提供了一种方式来隔离和封装代码执行环境。
在传统的 JavaScript 执行环境中，所有的代码都共享同一个全局对象，这可能导致全局命名空间的污染和安全问题。
Realm 通过创建一个独立的全局对象和作用域链，允许代码在一个隔离的环境中运行，从而避免这些问题。

# Features
隔离性：每个 Realm 都有自己的全局对象，代码在一个 Realm 中运行时，无法直接访问另一个 Realm 的全局对象或变量。
安全性：Realm 可以用来执行不可信的代码，因为它限制了代码对宿主环境的访问和修改能力。
模块化：Realm 有助于模块化代码，使得代码库可以被分割成独立的部分，每个部分都有自己的状态和依赖。


# Principle
with + Proxy隔离全局环境且做代理访问