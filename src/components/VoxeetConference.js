import React, { Component } from 'react';
import '../assets/css/call-tester.less';
import logo from '../assets/images/logo.svg';
import AudioVuMeter from './AudioVuMeter'
import Sdk from './sdk'
import Chart from 'chart.js';
import moment from 'moment';
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import Bowser from "bowser";

import VoxeetSdk from '@voxeet/voxeet-web-sdk'
import { ok } from 'assert';

class VoxeetConferencePreCall extends Component {

  constructor(props) {
    super(props);
    this.state = {
      nextTestAudioOnly: this.props.audioOnly,
      audioOnly: this.props.audioOnly,
      error: null,
      endTesting: false,
      statsAudio: [],
      statsVideo: [],
      oldAudioValue:0,
      mos: 0,
      userStream: null,
      initialized: false,
      oldVideoValue: 0,
      oldTimestampVideo:0,
      oldTimestampAudio:0,
      timestampVideo: [],
      timestampAudio: [],
      network: [],
      audioDevices: [],
      outputDevices: [],
      videoDevices: [],
      rawDataStats: [],
      videoHeight: 480,
      bitrateAudioChart: null,
      bitrateVideoChart: null,
      videoWidth: 640,
      joinConferenceState: false,
      intervalId: null
    }
    this.startCallTest = this.startCallTest.bind(this)
    this.getStats = this.getStats.bind(this)
    this.reStartTesting = this.reStartTesting.bind(this)
    this.handleChangeAudioOnly = this.handleChangeAudioOnly.bind(this)
    this.initializeConference = this.initializeConference.bind(this)
}

  componentDidMount() {
    this.initializeConference()
  }

  initializeConference() {
    const sdk = Sdk.create()
    sdk.initialize(this.props.consumerKey, this.props.consumerSecret, { name: 'Call-tester' })
    .then(() => {
      this.startCallTest()
      Sdk.instance.on('qualityIndicators', (ind) => {
        this.setState({ mos: ind.mos })
      })
      this.setState({ initialized: true })
    })
    .catch((err) => {
      this.setState({ initialized: false, error: "An error occured during initializing the conference, please check your consumerKey/consumerSecret", endTesting: true })
    })
  }

  handleChangeAudioOnly() {
    this.setState({
      nextTestAudioOnly: !this.state.nextTestAudioOnly,
    });
  }


  startCallTest() {
    this.setState({ audioOnly: this.state.nextTestAudioOnly })
    var constraints = {audio: true, video: this.state.nextTestAudioOnly ? false : true};

    Sdk.instance.joinConference("call-tester-" + Math.floor(Math.random() * 1001), {conference: { params: { stats: true, videoCodec: "H264" }}, constraints: constraints})
      .then((info) => {
        const optionsBitrate = {
          spanGaps: true,
          animation: false,
          legend: {
              display: false
          },
          draggable: true,
          scales: {
              yAxes:[{
                  scaleLabel: {
                      display: true,
                      labelString: 'kb/s',
                      fontFamily: "Open Sans",
                      fontSize: 14
                  },
                  ticks: {
                    beginAtZero: true,
                    min: 0
                }
              }],
              xAxes:[{
                  scaleLabel: {
                      display: true,
                      labelString: 'time',
                      fontFamily: "Open Sans",
                      fontSize: 14
                  }
              }]
          }
        }

        var bitrateAudio = document.getElementById("bitrateAudio");
        var bitrateAudioChart = new Chart(bitrateAudio, {
            type: 'line',
            options: optionsBitrate
        });

        bitrateAudioChart.data.datasets.push({
          label: "bitrate_audio",
          data: this.state.statsAudio,
          pointBorderWidth: 3,
          fill: false,
          borderColor: "#e57373",
          pointBorderColor: "#e57373",
          pointBackgroundColor: "#e57373",
          pointHoverRadius: 3,
          pointHoverBorderWidth: 1,
          pointRadius: 3,
          borderWidth: 1
        })

        if (!this.state.nextTestAudioOnly) {
          var bitrateVideo = document.getElementById("bitrateVideo");
          var bitrateVideoChart = new Chart(bitrateVideo, {
              type: 'line',
              options: optionsBitrate
          });

          bitrateVideoChart.data.datasets.push({
            label: "bitrate_video",
            data: this.state.statsVideo,
            pointBorderWidth: 3,
            borderColor: "#e57373",
            pointBorderColor: "#e57373",
            pointBackgroundColor: "#e57373",
            fill: false,
            pointHoverRadius: 3,
            pointHoverBorderWidth: 1,
            pointRadius: 3,
            borderWidth: 1
          })
        }
        var intervalId = setInterval(this.getStats, 1000);
        this.setState({intervalId: intervalId, joinConferenceState: true, bitrateAudioChart, bitrateVideoChart, audioOnly: this.state.nextTestAudioOnly});
        setTimeout(() => {
          const browser = Bowser.getParser(window.navigator.userAgent);
          const browserInfo = browser.getBrowser();
          const isValidBrowser = browser.satisfies({
            chrome: ">65",
            firefox: ">60",
            edge: ">17",
            safari: ">11",
            opera: ">57"
          });
          clearInterval(this.state.intervalId);
          this.setState({intervalId: null , endTesting: true, isValidBrowser, browserInfo });
          Sdk.instance.leaveConference()
          navigator.mediaDevices.getUserMedia({ audio: true, video: this.state.audioOnly ? false : true })
          .then((stream) => {
              if (!this.state.audioOnly) {
                navigator.attachMediaStream(this.video, stream)
                this.setState({ videoHeight: stream.getVideoTracks()[0].getSettings().height, videoWidth: stream.getVideoTracks()[0].getSettings().width, userStream: stream })
              } else {
                this.setState({ userStream: stream })
              }
              if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                  return navigator.mediaDevices.enumerateDevices()
                      .then(sources => {
                      let audioDevices = new Array();
                      let videoDevices = new Array();
                      let outputDevices = new Array();
                      sources.forEach(source => {
                          if (source.kind === 'videoinput') {
                            videoDevices.push(source);
                          }
                          if (source.kind === `audioinput`) {
                            audioDevices.push(source);
                          }
                          if (source.kind === 'audiooutput') {
                            outputDevices.push(source);
                          }
                      })
                      this.setState({ audioDevices, outputDevices, videoDevices })
                  });
              }
          })
        }, 5000)
      })
      .catch((err) => {
        this.setState({ error: "An error occured during joining the conference, please make sure that devices are allowed.", endTesting: true })
      })
  }

  reStartTesting() {
    this.setState({
      endTesting: false,
      error: null,
      statsAudio: [],
      statsVideo: [],
      oldAudioValue:0,
      mos: 0,
      userStream: null,
      oldVideoValue: 0,
      oldTimestampVideo:0,
      oldTimestampAudio:0,
      timestampVideo: [],
      network: [],
      timestampAudio: [],
      audioDevices: [],
      rawDataStats: [],
      outputDevices: [],
      videoDevices: [],
      videoHeight: 480,
      videoWidth: 640,
      joinConferenceState: false,
      intervalId: null
    })
    if (this.state.initialized) {
      this.startCallTest()
    } else {
      this.initializeConference()
    }
  }

  getStats() {
    const { statsAudio, statsVideo, rawDataStats } = this.state
    Sdk.instance.stats(Sdk.instance.conference.id)
      .then((stat) => {
        const tmp = stat[0].stats
        rawDataStats.push(stat)
        for (var i = 0; i < Object.keys(tmp).length; i++) {
          if (tmp[i].type == "local-candidate") {
            let exist = false
            this.state.network.map((net, count) => {
              if (tmp[i].id == net.id) exist = true
            })
            if (!exist) this.state.network.push(tmp[i])
          }
          if (tmp[i].id.indexOf("RTCOutboundRTPAudioStream_") >= 0 || tmp[i].id.indexOf("outbound_rtp_audio_") >= 0) {
            if ( ((tmp[i].timestamp - this.state.oldTimestampAudio) / 1000) > 0) {
              this.state.timestampAudio.push(moment.unix(tmp[i].timestamp/1000).format('h:mm:ss a'))
              let bitrateAudio = tmp[i].bytesSent - this.state.oldAudioValue / ((tmp[i].timestamp - this.state.oldTimestampAudio) / 1000)
              this.state.oldAudioValue = tmp[i].bytesSent
              this.state.oldTimestampAudio = tmp[i].timestamp
              this.state.statsAudio.push(bitrateAudio * 8)
              this.state.bitrateAudioChart.data.labels.push(moment.unix(tmp[i].timestamp/1000).format('h:mm:ss a'))
              this.state.bitrateAudioChart.data.datasets.forEach((dataset) => {
                dataset.data.push(bitrateAudio * 8);
              });
            }
          }
          if ((tmp[i].id.indexOf("RTCOutboundRTPVideoStream_") >= 0  || tmp[i].id.indexOf("outbound_rtp_video_") >= 0) && !this.state.audioOnly) {
            if ( ((tmp[i].timestamp - this.state.oldTimestampVideo) / 1000) > 0) {
              this.state.timestampVideo.push(moment.unix(tmp[i].timestamp/1000).format('h:mm:ss a'))
              let bitrateVideo = tmp[i].bytesSent - this.state.oldVideoValue / ((tmp[i].timestamp - this.state.oldTimestampVideo) / 1000)
              this.state.oldVideoValue = tmp[i].bytesSent
              this.state.oldTimestampVideo = tmp[i].timestamp
              this.state.statsVideo.push(bitrateVideo * 8)
              this.state.bitrateVideoChart.data.labels.push(moment.unix(tmp[i].timestamp/1000).format('h:mm:ss a'))
              this.state.bitrateVideoChart.data.datasets.forEach((dataset) => {
                dataset.data.push(bitrateVideo * 8);
              });
            }
          }
          if (!this.state.audioOnly) this.state.bitrateVideoChart.update()
          this.state.bitrateAudioChart.update()
        }
      });    
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  render() {
    const { endTesting, statsAudio, statsVideo, error, mos } = this.state
    return (
      <div className="container">
        <div className="container-logo">
          <img src={logo} />
        </div>
        { endTesting &&
          <div className="block-start">
            <div className="container-start-test">
              <input type="checkbox" id="audioOnly" checked={this.state.nextTestAudioOnly} onChange={this.handleChangeAudioOnly} />
              <label id="audioOnlyLabel" htmlFor="audioOnly">Audio Only</label>
            </div>
            <div className="container-start-test">
              <button onClick={this.reStartTesting} className="btn">Restart testing</button>
            </div>
          </div>
        }
        { error != null &&
          <div className="block-error">
              { error }
          </div>
        }
        { error == null &&
          <div className="block block-canvas-graph">
                <div className="title-section">Quality call indicator</div>
                <div className="container-graph">
                  <div className="title-graph">
                    Audio bitrate
                  </div>
                  <canvas id="bitrateAudio" width="50%" height="40"></canvas>
                </div>
                { !this.state.audioOnly &&
                <div className="container-graph">
                  <div className="title-graph">
                    Video bitrate
                  </div>
                  <canvas id="bitrateVideo" width="50%" height="40"></canvas>
                </div>
                }
          </div>
        }
        { error == null &&
          <div className="block">
            <div className="title-section">Conference quality</div>
            <ul className="list">
              <li>
                <div className="title">MOS</div>
                <div className={(mos > 4 && "good") || ((mos > 3.5 && mos < 4) && "average-good") || ((mos > 2.5 && mos < 3) && "average") || ((mos < 2.5) && "bad") }>
                  { mos == 0 ?
                    "Calculating ..."
                    :
                    mos
                  }
                </div>
              </li>
            </ul>
            <div className="mos-explanation">
                The mean opinion score (MOS), is a value from 1 to 5 that indicates the average conference quality.
                Very good better than 4. 
                Good 3.5 to 4. 
                Acceptable 2.5 to 3. 
                Bad is below 2.5.
            </div>
          </div>
        }
        { endTesting && (error == null) ?
          <div>
            <div>
              <div className="container-stats">
            </div>

            <div className="block">
                <div className="title-section">Software Setup</div>
                <ul className="list">
                  <li>
                    <div className="title">Browser compatibility</div>
                    <div>
                    { this.state.isValidBrowser ?
                      <div>👍</div>
                      :
                      <div>👎</div>
                    }
                    </div>
                  </li>
                  <li>
                      <div className="title">Browser name</div>
                      <div>
                        {this.state.browserInfo && this.state.browserInfo.name}
                      </div>
                  </li>
                  <li>
                      <div className="title">Platform</div>
                      <div>
                        {navigator.platform}
                      </div>
                  </li>
                  <li>
                      <div className="title">Browser version</div>
                      <div>
                        {this.state.browserInfo && this.state.browserInfo.version}
                      </div>
                  </li>
                </ul>
              </div>

              { this.state.browserInfo.name != "Safari" &&
              <div className="block">
                <div className="title-section">Network</div>
                <ul className="list list-network">
                  { this.state.network.map((net, i) => {
                    return(<li key={i}>
                      <div className="title">Protocol: {net.protocol}</div>
                      <div>
                          IP : {net.ip || net.address}
                      </div>
                      <div>
                        candidateType : {net.candidateType}
                      </div>
                      <div>
                        networkType : {net.networkType || "N/A"}
                      </div>
                    </li>)
                    })
                  }
                </ul>
              </div>
              }


              <div className="block">
                <div className="title-section">Hardware Setup Audio</div>
                    <div className="contain-audio">
                      <div className="container-input">
                        <label htmlFor="video">Microphone :</label>
                        <select name="audio" className="form-control" disabled={true} onChange={this.setAudioDevice}>
                          {this.state.audioDevices.map((device, i) =>
                            <option key={i} value={device.deviceId}>{device.label}</option>
                          )}
                        </select>
                        <AudioVuMeter userStream={this.state.userStream}/>
                      </div>

                      { this.state.browserInfo.name == "Chrome" &&
                        <div className="container-output">
                          <label htmlFor="video">Output :</label>
                          <select name="output" className="form-control" disabled={true} onChange={this.setOutputDevice}>
                          {this.state.outputDevices.map((device, i) =>
                            <option key={i} value={device.deviceId}>{device.label}</option>
                          )}
                          </select>
                        </div>
                      }

                    </div>
                </div>
              </div>


              { !this.state.audioOnly &&
              <div className="block">
                <div className="title-section">Hardware Setup Video</div>
                  <div className="container-video">
                    <video className="video-participant"
                      width="360"
                      id="video-settings"
                      playsInline
                      height="280"
                      ref={ref => this.video = ref}
                      autoPlay
                      muted
                    />
                  </div>
                  <div className="form-group">
                    <div>
                      <select name="video" className="form-control" disabled={true}>
                        {this.state.videoDevices.map((device, i) =>
                          <option key={i} value={device.deviceId}>{device.label}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      Resolution: {this.state.videoWidth}x{this.state.videoHeight}
                    </div>
                  </div>
              </div>
              }

              <div className="block">
                <div className="title-section">Communication with conference</div>
                <ul className="list">
                  <li>
                    <div className="title">Create / Join conference</div>
                    <div>
                    { this.state.joinConferenceState ?
                      <div>👍</div>
                      :
                      <div>👎</div>
                    }
                    </div>
                  </li>
                  <li>
                    <div className="title">Events received</div>
                    <div>
                    { mos != 0 ?
                      <div>👍</div>
                      :
                      <div>👎</div>
                    }
                    </div>
                  </li>
                </ul>
              </div>
          </div>

        :
         error == null &&
          <div className="block-loading">
            <div id="loader-container"><div className="loader"></div></div>
            <div className="state-testing">
              Test is running, please wait<span className="one">.</span><span className="two">.</span><span className="three">.</span>​
            </div>
          </div>
      }
      </div>
    )
  }
}

VoxeetConferencePreCall.propTypes = {
  audioOnly: PropTypes.bool.isRequired,
  consumerKey: PropTypes.string.isRequired,
  consumerSecret: PropTypes.string.isRequired
}

VoxeetConferencePreCall.defaultProps = {
}

export default VoxeetConferencePreCall;
