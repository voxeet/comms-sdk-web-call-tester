Dolby<span>.io</span> Call Tester
=====================

<p align="center">
<img src="wiki/dolbyio.jpeg" alt="Dolby.io logo" title="Dolby.io logo" width="200"/>
</p>

This project is a pre-call tester to check client readiness for connecting to dolby<span>.io</span>. The tool will check network, devices, and available network bandwidth for audio and video traffic.

## Project setup

 - Download this project.
 - Get your Dolby<span>.io</span> consumerKey and consumerSecret from our [Developer Portal](https://dolby.io/dashboard/).
 - In the file `src/components/home.js` replace the following code with your consumerKey and consumerSecret.

```
consumerKey: "CONSUMER_KEY",
consumerSecret: "CONSUMER_SECRET",
```

## Initializing the project

Run the following command to install all the dependencies required to run the project:

```bash
yarn install
```

## Running the project

Run the following command to start the project:

```bash
yarn start
```

The project is now running, go to: http://localhost:8081

## Building the project

If you want to generate a bundle file that you can deploy on a web server, run the following command:

```bash
yarn run build
```

Get the files in the `dist` folder and deploy them on your web server.

## Dependencies

  * [Voxeet Web SDK](https://www.npmjs.com/package/@voxeet/voxeet-web-sdk) - The WEB SDK Voxeet to communicate with Dolby<span>.io</span> servers


## Run a test

Run the project and go to the web page http://localhost:8081, you should get the following screen:

<p align="center">
<img src="wiki/welcome.png" alt="Dolby.io logo" title="Dolby.io logo" width="640"/>
</p>

Click the _Start testing_ button, the test will begin.

<p align="center">
<img src="wiki/test-running.png" alt="Dolby.io logo" title="Dolby.io logo" width="640"/>
</p>

After about 30 seconds, you will see the result showing up on the screen.

<p align="center">
<img src="wiki/test-result.png" alt="Dolby.io logo" title="Dolby.io logo" width="640"/>
</p>

## GitHub Pages

You can test this project directly on our GitHub pages: https://voxeet.github.io/voxeet-sdk-web-tool/
