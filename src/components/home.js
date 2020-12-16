import React, { Component } from 'react';
import '../assets/css/call-tester.less';
import logo from '../assets/images/logo.png';
import VoxeetConference from './VoxeetConference'

class Home extends Component {

  constructor(props) {
      super(props);
      this.state = {
        startTest: false,
        // Set your Consumer Key and Secret here
        consumerKey: "CONSUMER_KEY",
        consumerSecret: "CONSUMER_SECRET",
        audioOnly: false,
        promptKeys: true
      }
      this.state = {
        audioOnly: false,
        promptKeys: this.state.consumerKey.includes("CONSUMER_") || this.state.consumerSecret.includes("CONSUMER_")
      }
      this.startTesting = this.startTesting.bind(this)
      this.handleChangeAudioOnly = this.handleChangeAudioOnly.bind(this)
      this.handleChangeConsumerKey = this.handleChangeConsumerKey.bind(this)
      this.handleChangeConsumerSecret = this.handleChangeConsumerSecret.bind(this)
  }

  startTesting() {
    this.setState({ startTest: true })
  }

  handleChangeAudioOnly(e) {
    this.setState({
      audioOnly: e.target.checked
    });
  }

  handleChangeConsumerKey(e) {
    this.setState({
      consumerKey: e.target.value,
    });
  }

  handleChangeConsumerSecret(e) {
    this.setState({
      consumerSecret: e.target.value,
    });
  }

  render() {
      const { startTest } = this.state
        return (
          <div> 
            <div className="container-background"></div>
            { startTest ?
              <VoxeetConference consumerKey={this.state.consumerKey} consumerSecret={this.state.consumerSecret} audioOnly={this.state.audioOnly} />
              :
              <div className="container">
                <div className="container-logo">
                  <img src={logo} />
                </div>
                <div className="block-start">
                    { this.state.promptKeys &&
                      <div className="container-start-test">
                        <label id="consumerKeyLabel" htmlFor="consumerKey">Consumer Key</label>
                        <input type="text" id="consumerKey" onChange={this.handleChangeConsumerKey} />
                        <br />

                        <label id="consumerSecretLabel" htmlFor="consumerSecret">Consumer Secret</label>
                        <input type="password" id="consumerSecret" onChange={this.handleChangeConsumerSecret} />
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
                      <p>Powered by <a href="https://dolby.io" target="_blank">dolby.io</a></p>
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
