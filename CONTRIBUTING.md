# Contributing

We love contributions from everyone.
By participating in this project,
you agree to abide by our [code_of_conduct].

We expect everyone to follow the code of conduct
anywhere in Razorpay's project codebases,
issue trackers, chatrooms, and mailing lists.

## Contributing Code

Checkout the latest master to make sure the feature hasn't been implemented or
the bug hasn't been fixed yet.

Check the issue tracker to make sure someone already hasn't requested it and/or
contributed to it.

Fork the repo.

1. Use the example project to test the module.
2. Delete the `postinstall` step from `package.json`. Remember to revert this
change when commiting.
3. Edit example/reload.sh to configure your path.
4. Follow instructions to link your project with the iOS SDK, as given in the [README].
5. Run example/reload.sh every time you make a change to the module.

Make your change. Follow this [style guide][style].

Push to your fork. Write a [good commit message][commit]. Submit a pull request.

Others will give constructive feedback.
This is a time for discussion and improvements,
and making the necessary changes will be required before we can
merge the contribution.

[code_of_conduct]: code_of_conduct.md "Code of Conduct"
[commit]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html "A short guide on how to write good commit messages"
[README]: README.md#linking-ios-sdk "Linking to the iOS SDK"
[style]: https://github.com/thoughtbot/guides/tree/master/style "Styleguides by Thoughtbot"
