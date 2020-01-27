# Release Helper

## What is this ?

A doc that helps you release the react-native package by bypassing the manual overhead.

### How to use it ?

Well , its fairly simple there is a script called UpdateReactCheckout.sh in the scripts folder , run it and enter what it asks you.It will ask you for the path of
the react native directory, the latest version of the framework and the version of the example.Thats it !!  

It will create a branch , download the required files , update the package.json ,create a tag and a PR.All you have
do is add an assignee get it merged and execute npm publish. 
