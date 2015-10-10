Good morning, Children.

Congratulations on successfully cloning the repository.

Now you have the infrastructure necessary to build the server logic and i/o functions.

First, you need to make sure that you can run the server and navigate to the web interface. We are using a JavaScript-based server frameork called Node.js.

If you use Mac OS X, open terminal and run the following commands (Make sure you have the Xcode command-line tools installed):
	1) Install Homebrew:

		ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

	2) Get Homebrew ready to install node.

		brew update
		brew doctor

	2) To install Node:

		brew install node

	3) Test your Node installation:

		node -v	

If all has gone well, you have gotten through all of the above steps with no errors. Now it's time to run and test the Node server.

	1) Navigate your command line tool (conventionally command prompt or terminal) to the "codefiles" directory inside the project repository folder. 

	2) Now execute the following command:

		node analysis_server.js

	3) Now the server should be running (there should be some confirmation in the command line). Depending on where we are in the dev process, the next step will have you doing one of several things.

		a) Direct your browser to localhost http://127.0.0.1:8080 and you will find some interesting stuff.

		b) Use a REST client such as PostMan (a wonderfully useful Chrome extension) to send a POST request to http://127.0.0.1:8080 with some content (formatting: x-www-form-urlencoded).
