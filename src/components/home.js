import React, { Component } from 'react';
import '../assets/css/call-tester.less';
import logo from '../assets/images/logo.png';
import VoxeetConference from './VoxeetConference'

class Home extends Component {

  constructor(props) {
      super(props);

      // Load the access token from the URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('token');

      this.state = {
        startTest: false,
        accessToken: accessToken,
        audioOnly: false,
        showInitialization: !accessToken,
      };

      this.startTesting = this.startTesting.bind(this);
      this.handleChangeAudioOnly = this.handleChangeAudioOnly.bind(this);
      this.handleChangeAccessToken = this.handleChangeAccessToken.bind(this);
  }

  startTesting() {
    this.setState({ startTest: true });
  }

  handleChangeAudioOnly(e) {
    this.setState({
      audioOnly: e.target.checked,
    });
  }

  handleChangeAccessToken(e) {
    this.setState({
      accessToken: e.target.value,
    });
  }

  render() {
      const { startTest } = this.state
        return (
          <div> 
            <div className="container-background"></div>
            { startTest ?
              <VoxeetConference
                accessToken={this.state.accessToken}
                audioOnly={this.state.audioOnly} />
              :
              <div className="container">
                <div className="container-logo">
                  <img src={logo} />
                </div>
                <div className="block-start">
                    { this.state.showInitialization &&
                      <div className="container-start-test">
                        <div className="container-start-title">Use an <a href="https://docs.dolby.io/communications-apis/reference/get-client-access-token" target="_blank">access token</a> to initialize the SDK:</div>
                        <label id="accessTokenLabel" htmlFor="accessToken">Access Token</label>
                        <input type="text" id="accessToken" onChange={this.handleChangeAccessToken} />
                      </div>
                    }
                    <div className="container-start-test">
                      <input type="checkbox" id="audioOnly" checked={this.state.audioOnly} onChange={this.handleChangeAudioOnly} />
                      <label id="audioOnlyLabel" htmlFor="audioOnly">Audio Only</label>
                      
                      <button onClick={this.startTesting} className="btn">Start testing</button>
                    </div>
                </div>
                <div className="block">
                  <div className="container-explanation">
                      <div className="container-explanation-title">Connection</div>
                  </div>
                  <div className="container-explanation">
                      <div className="container-explanation-title">Hardware</div>
                  </div>
                  <div className="container-explanation">
                      <div className="container-explanation-title">Call Quality</div>
                  </div>
                  <div className="container-explanations">
                    <div className="container-explanation">
                      <span>
                        This tool attempts to connect to a conference for 30 seconds and obtain information about the network connection. 
                      </span>
                    </div>
                    <div className="container-explanation">
                      <span>
                        This tool gathers your media device information. Please make sure to allow camera and microphone access when starting the test.
                      </span>
                    </div>
                    <div className="container-explanation">
                      <span>
                        This tool checks if you have a good network connection. A graph will be displayed to present the Audio and Video bitrate.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="block-footer">
                    <div className="container-start-test">
                      <p>Powered by <a href="https://dolby.io" target="_blank">Dolby.io</a> - <a href="https://github.com/dolbyio-samples/comms-sdk-web-call-tester" target="_blank">GitHub repo</a></p>
                    </div>
                </div>
              </div>
            }
          </div>
      )
  }
}

Home.propTypes = {
}

export default Home;
