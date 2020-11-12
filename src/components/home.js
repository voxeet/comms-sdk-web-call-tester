import React, { Component } from 'react';
import PropTypes from 'prop-types'
import '../assets/css/call-tester.less';
import logo from '../assets/images/logo.png';
import VoxeetConference from './VoxeetConference'

class Home extends Component {

  constructor(props) {
      super(props);
      this.state = {
        startTest: false,
        consumerKey: "CONSUMER_KEY",
        consumerSecret: "CONSUMER_SECRET",
        audioOnly: false
      }
      this.startTesting = this.startTesting.bind(this)
      this.handleChangeAudioOnly = this.handleChangeAudioOnly.bind(this)
  }

  startTesting() {
    this.setState({ startTest: true })
  }

  handleChangeAudioOnly() {
    this.setState({
      audioOnly: !this.state.audioOnly,
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
                  <div className="container-start-test">
                    <input type="checkbox" id="audioOnly" checked={this.state.audioOnly} onChange={this.handleChangeAudioOnly} />
                    <label id="audioOnlyLabel" htmlFor="audioOnly">Audio Only</label>
                  </div>
                  <div className="container-start-test">
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
              </div>
            }
          </div>
      )
  }
}

Home.propTypes = {
}

export default Home;
