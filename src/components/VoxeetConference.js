import React, { Component } from "react";
import "../assets/css/call-tester.less";
import logo from "../assets/images/logo.png";
import AudioVuMeter from "./AudioVuMeter";
import Chart from "chart.js";
import moment from "moment";
import PropTypes from "prop-types";
import Bowser from "bowser";

import VoxeetSdk from "@voxeet/voxeet-web-sdk";

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
      oldAudioValue: 0,
      mos: 0,
      userStream: null,
      initialized: false,
      sdkVersion: null,
      oldVideoValue: 0,
      oldTimestampVideo: 0,
      oldTimestampAudio: 0,
      timestampVideo: [],
      timestampAudio: [],
      network: [],
      audioDevices: [],
      selectedAudioDevice: null,
      outputDevices: [],
      videoDevices: [],
      selectedVideoDevice: null,
      rawDataStats: [],
      videoHeight: 480,
      bitrateAudioChart: null,
      bitrateVideoChart: null,
      videoWidth: 640,
      sessionOpenState: false,
      createConferenceState: false,
      joinConferenceState: false,
      leaveConferenceState: false,
      intervalId: null
    };
    this.startCallTest = this.startCallTest.bind(this);
    this.runTest = this.runTest.bind(this);
    this.getStats = this.getStats.bind(this);
    this.reStartTesting = this.reStartTesting.bind(this);
    this.handleChangeAudioOnly = this.handleChangeAudioOnly.bind(this);
    this.initializeConference = this.initializeConference.bind(this);
  }

  componentDidMount() {
    this.initializeConference();
  }

  initializeConference() {
    VoxeetSdk.initializeToken(this.props.accessToken, () => new Promise((resolve) => resolve(this.props.accessToken)));

    this.startCallTest();
    this.setState({
      initialized: true,
      sdkVersion: VoxeetSdk.version
    });
  }

  handleChangeAudioOnly() {
    this.setState({
      nextTestAudioOnly: !this.state.nextTestAudioOnly
    });
  }

  startCallTest() {
    if (VoxeetSdk.session.participant == undefined) {
      var userInfo = { name: "call-tester", externalId: "call-tester" };
      VoxeetSdk.session
        .open(userInfo)
        .then(() => {
          this.setState({
            sessionOpenState: true
          });
        })
        .then(() => this.runTest());
    } else {
      this.runTest();
    }
  }

  runTest() {
    this.setState({ audioOnly: this.state.nextTestAudioOnly });
    var constraints = {
      audio: true,
      video: this.state.nextTestAudioOnly ? false : true
    };
    var alreadyStarted = constraints.video;

    VoxeetSdk.conference
      .create({
        alias: "call-tester-" + Math.floor(Math.random() * 1001),
        params: {
          stats: true,
          dolbyVoice: true,
        }
      })
      .then(conference => {
        this.setState({
          createConferenceState: true
        });

        VoxeetSdk.conference.on("participantUpdated", () => {
          if (!alreadyStarted) {
            alreadyStarted = true;
            const videoConstraints = {
              mandatory: {
                minWidth: 640,
                minHeight: 480,
                maxWidth: 1920,
                maxHeight: 1080,
                minFrameRate: 10,
                maxFrameRate: 30
              }
            };

            VoxeetSdk.video.local
              .start(videoConstraints)
              .then(() => console.log("Video started"))
              .catch(e => console.error(e));
          }
        });

        const joinConstraints = {
          constraints: constraints,
          dvwc: false, // DVWC does not expose audio stats
        };
        
        VoxeetSdk.conference
          .join(conference, joinConstraints)
          .then(info => {
            const optionsBitrate = {
              spanGaps: true,
              animation: false,
              legend: {
                display: false
              },
              draggable: true,
              scales: {
                yAxes: [
                  {
                    scaleLabel: {
                      display: true,
                      labelString: "bps",
                      fontFamily: "Open Sans",
                      fontSize: 14
                    },
                    ticks: {
                      beginAtZero: true,
                      min: 0
                    }
                  }
                ],
                xAxes: [
                  {
                    scaleLabel: {
                      display: true,
                      labelString: "time",
                      fontFamily: "Open Sans",
                      fontSize: 14
                    }
                  }
                ]
              }
            };

            var bitrateAudio = document.getElementById("bitrateAudio");
            var bitrateAudioChart = new Chart(bitrateAudio, {
              type: "line",
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
            });

            if (!this.state.nextTestAudioOnly) {
              var bitrateVideo = document.getElementById("bitrateVideo");
              var bitrateVideoChart = new Chart(bitrateVideo, {
                type: "line",
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
              });
            }

            var intervalId = setInterval(this.getStats, 1000);
            this.setState({
              intervalId: intervalId,
              joinConferenceState: true,
              bitrateAudioChart,
              bitrateVideoChart,
              audioOnly: this.state.nextTestAudioOnly
            });
            
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

              this.setState({
                intervalId: null,
                endTesting: true,
                isValidBrowser,
                browserInfo
              });

              VoxeetSdk.conference.leave()
                .then(() => {
                  this.setState({
                    leaveConferenceState: true,
                  });

                  return navigator.mediaDevices
                    .getUserMedia({
                      audio: true,
                      video: this.state.audioOnly ? false : true
                    });
                })
                .then(stream => {
                  if (!this.state.audioOnly) {
                    navigator.attachMediaStream(this.video, stream);
                    this.setState({
                      videoHeight: stream.getVideoTracks()[0].getSettings().height,
                      videoWidth: stream.getVideoTracks()[0].getSettings().width,
                      userStream: stream
                    });
                  } else {
                    this.setState({ userStream: stream });
                  }

                  let selectedVideoDeviceLabel = null;
                  let selectedAudioDeviceLabel = null;
                  stream.getTracks().forEach(track => {
                    if ("video" == track.kind) {
                      selectedVideoDeviceLabel = track.label
                    } else if ("audio" == track.kind) {
                      selectedAudioDeviceLabel = track.label;
                    }
                  });

                  if (
                    navigator.mediaDevices &&
                    navigator.mediaDevices.enumerateDevices
                  ) {
                    return navigator.mediaDevices
                      .enumerateDevices()
                      .then(sources => {
                        let audioDevices = new Array();
                        let videoDevices = new Array();
                        let outputDevices = new Array();
                        let selectedVideoDevice = "";
                        let selectedAudioDevice = "";

                        sources.forEach(source => {
                          if (source.kind === "videoinput") {
                            videoDevices.push(source);
                            if (selectedVideoDeviceLabel == source.label) {
                              selectedVideoDevice = source.deviceId;
                            }
                          }
                          if (source.kind === `audioinput`) {
                            audioDevices.push(source);
                            if (selectedAudioDeviceLabel == source.label) {
                              selectedAudioDevice = source.deviceId;
                            }
                          }
                          if (source.kind === "audiooutput") {
                            outputDevices.push(source);
                          }
                        });

                        this.setState({
                          audioDevices,
                          outputDevices,
                          videoDevices,
                          selectedVideoDevice,
                          selectedAudioDevice
                        });
                      });
                  }
                });
            }, 16000);
          })
          .catch(err => {
            this.setState({
              error:
                "An error occurred during joining the conference, please make sure that devices are allowed.",
              endTesting: true
            });
          });
      });
  }

  reStartTesting() {
    this.setState({
      endTesting: false,
      error: null,
      statsAudio: [],
      statsVideo: [],
      oldAudioValue: 0,
      mos: 0,
      userStream: null,
      oldVideoValue: 0,
      oldTimestampVideo: 0,
      oldTimestampAudio: 0,
      timestampVideo: [],
      network: [],
      timestampAudio: [],
      audioDevices: [],
      selectedAudioDevice: null,
      rawDataStats: [],
      outputDevices: [],
      videoDevices: [],
      selectedVideoDevice: null,
      videoHeight: 480,
      videoWidth: 640,
      createConferenceState: false,
      joinConferenceState: false,
      leaveConferenceState: false,
      intervalId: null
    });
    if (this.state.initialized) {
      this.startCallTest();
    } else {
      this.initializeConference();
    }
  }

  getStats() {
    const { statsAudio, statsVideo, rawDataStats } = this.state;
    VoxeetSdk.conference.localStats().then(stat => {
      const tmp = Array.from(stat.values())[0];
      rawDataStats.push(stat);
      for (var i = 0; i < Object.keys(tmp).length; i++) {
        if (tmp[i].type == "local-candidate") {
          let exist = false;
          this.state.network.map((net, count) => {
            if (tmp[i].id == net.id) exist = true;
          });
          if (!exist) {
            tmp[i].state = false;
            this.state.network.push(tmp[i]);
          }
        }

        if (tmp[i].type === "outbound-rtp" && tmp[i].mediaType === "audio") {
          if ((tmp[i].timestamp - this.state.oldTimestampAudio) / 1000 > 0) {
            this.state.timestampAudio.push(
              moment.unix(tmp[i].timestamp / 1000).format("h:mm:ss a")
            );
            let bitrateAudio =
              tmp[i].bytesSent -
              this.state.oldAudioValue /
                ((tmp[i].timestamp - this.state.oldTimestampAudio) / 1000);
            this.state.oldAudioValue = tmp[i].bytesSent;
            this.state.oldTimestampAudio = tmp[i].timestamp;
            this.state.statsAudio.push(bitrateAudio * 8);
            this.state.bitrateAudioChart.data.labels.push(
              moment.unix(tmp[i].timestamp / 1000).format("h:mm:ss a")
            );
            this.state.bitrateAudioChart.data.datasets.forEach(dataset => {
              dataset.data.push(bitrateAudio * 8);
            });
          }
        }
        if (
          tmp[i].type === "outbound-rtp" &&
          tmp[i].mediaType === "video" &&
          !this.state.audioOnly
        ) {
          if ((tmp[i].timestamp - this.state.oldTimestampVideo) / 1000 > 0) {
            this.state.timestampVideo.push(
              moment.unix(tmp[i].timestamp / 1000).format("h:mm:ss a")
            );
            let bitrateVideo =
              tmp[i].bytesSent -
              this.state.oldVideoValue /
                ((tmp[i].timestamp - this.state.oldTimestampVideo) / 1000);
            this.state.oldVideoValue = tmp[i].bytesSent;
            this.state.oldTimestampVideo = tmp[i].timestamp;
            this.state.statsVideo.push(bitrateVideo * 8);
            this.state.bitrateVideoChart.data.labels.push(
              moment.unix(tmp[i].timestamp / 1000).format("h:mm:ss a")
            );
            this.state.bitrateVideoChart.data.datasets.forEach(dataset => {
              dataset.data.push(bitrateVideo * 8);
            });
          }
        }
        if (
          tmp[i].type === "remote-inbound-rtp" &&
          tmp[i].mediaType === "audio"
        ) {
          var avgPL = ((tmp[i].packetsLost * 1.0) / tmp[i].packetsReceived) * 100;
          this.state.mos = Math.max(1, Math.ceil(5 - avgPL / 4));
        }
        if (!this.state.audioOnly) this.state.bitrateVideoChart.update();
        this.state.bitrateAudioChart.update();
      }
      for (var i = 0; i < Object.keys(tmp).length; i++) {
        if (tmp[i].type === "candidate-pair" && tmp[i].state === "succeeded") {
          for (var j = 0; j < this.state.network.length; j++) {
            if (this.state.network[j].id === tmp[i].localCandidateId)
              this.state.network[j].state = true;
          }
        }
      }
    });
  }
  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  render() {
    const { endTesting, statsAudio, statsVideo, error, mos } = this.state;
    return (
      <div className="container">
        <div className="container-logo">
          <img src={logo} />
        </div>
        {endTesting && (
          <div className="block-start">
            <div className="container-start-test">
              <input
                type="checkbox"
                id="audioOnly"
                checked={this.state.nextTestAudioOnly}
                onChange={this.handleChangeAudioOnly}
              />
              <label id="audioOnlyLabel" htmlFor="audioOnly">
                Audio Only
              </label>
            </div>
            <div className="container-start-test">
              <button onClick={this.reStartTesting} className="btn">
                Restart testing
              </button>
            </div>
          </div>
        )}
        {error != null && <div className="block-error">{error}</div>}
        {error == null && (
          <div className="block block-canvas-graph">
            <div className="title-section">Quality call indicator</div>
            <div className="container-graph">
              <div className="title-graph">Audio bitrate</div>
              <canvas id="bitrateAudio" width="50%" height="40"></canvas>
            </div>
            {!this.state.audioOnly && (
              <div className="container-graph">
                <div className="title-graph">Video bitrate</div>
                <canvas id="bitrateVideo" width="50%" height="40"></canvas>
              </div>
            )}
          </div>
        )}
        {endTesting && error == null ? (
          <div>
            <div>
              <div className="container-stats"></div>

              <div className="block">
                <div className="title-section">Software Setup</div>
                <ul className="list">
                  <li>
                    <div className="title">Browser compatibility</div>
                    <div>
                      {this.state.isValidBrowser ? (
                        <div>👍</div>
                      ) : (
                        <div>👎</div>
                      )}
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
                    <div>{navigator.platform}</div>
                  </li>
                  <li>
                    <div className="title">Browser version</div>
                    <div>
                      {this.state.browserInfo && this.state.browserInfo.version}
                    </div>
                  </li>
                  <li>
                    <div className="title">Voxeet SDK version</div>
                    <div>
                      <a target="_blank" href={"https://www.npmjs.com/package/@voxeet/voxeet-web-sdk/v/" + this.state.sdkVersion}>{this.state.sdkVersion}</a>
                    </div>
                  </li>
                </ul>
              </div>

              {this.state.network.length > 0 && (
                <div className="block">
                  <div className="title-section">Network</div>
                  <ul className="list list-network">
                    {this.state.network.map((net, i) => {
                      return (
                        <li key={i}>
                          <div className="title">Protocol: {net.protocol}</div>
                          <div>
                            IP: {" "}
                            {net.ip || net.address
                              ? net.ip || net.address
                              : "Unknown"}
                          </div>
                          <div>candidateType: {net.candidateType}</div>
                          <div>succeeded: {net.state ? "yes" : "no"}</div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="block">
                <div className="title-section">Hardware Setup Audio</div>
                <div className="contain-audio">
                  <div className="container-input">
                    <label htmlFor="audioDevices">Microphone:</label>
                    <ul id="audioDevices">
                      {this.state.audioDevices.map((device, i) => (
                        this.state.selectedAudioDevice == device.deviceId ? (
                          <li key={device.label}>✅ {device.label}</li>
                        ) : (
                          <li key={device.label}>❌ {device.label}</li>
                        )
                      ))}
                      <li>
                        <AudioVuMeter userStream={this.state.userStream} />
                      </li>
                    </ul>
                  </div>

                  {this.state.browserInfo.name == "Chrome" && (
                    <div className="container-output">
                      <label htmlFor="video">Output :</label>
                      <select
                        name="output"
                        className="form-control"
                        disabled={true}
                        onChange={this.setOutputDevice}
                      >
                        {this.state.outputDevices.map((device, i) => (
                          <option key={i} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!this.state.audioOnly && (
              <div className="block">
                <div className="title-section">Hardware Setup Video</div>
                <div className="container-video">
                  <video
                    className="video-participant"
                    width="360"
                    id="video-settings"
                    playsInline
                    height="280"
                    ref={ref => (this.video = ref)}
                    autoPlay
                    muted
                  />
                </div>
                <div className="form-group">
                  <div>
                    <label htmlFor="videoDevices">Camera:</label>
                    <ul id="videoDevices">
                      {this.state.videoDevices.map((device, i) => (
                        this.state.selectedVideoDevice == device.deviceId ? (
                          <li key={device.label}>✅ {device.label}</li>
                        ) : (
                          <li key={device.label}>❌ {device.label}</li>
                        )
                      ))}
                    </ul>
                  </div>
                  <div>
                    Resolution: {this.state.videoWidth}x{this.state.videoHeight}
                  </div>
                </div>
              </div>
            )}

            <div className="block">
              <div className="title-section">Communication with conference</div>
              <ul className="list">
                <li>
                  <div className="title">Open a session</div>
                  <div>
                    {this.state.sessionOpenState ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
                <li>
                  <div className="title">Create the conference</div>
                  <div>
                    {this.state.createConferenceState ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
                <li>
                  <div className="title">Join the conference</div>
                  <div>
                    {this.state.joinConferenceState ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
                <li>
                  <div className="title">Leave the conference</div>
                  <div>
                    {this.state.leaveConferenceState ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
              </ul>
            </div>

            <div className="block-footer">
                <div className="container-start-test">
                  <p>Powered by <a href="https://dolby.io" target="_blank">Dolby.io</a> - <a href="https://github.com/dolbyio-samples/comms-sdk-web-call-tester" target="_blank">GitHub repo</a></p>
                </div>
            </div>
          </div>
        ) : (
          error == null && (
            <div className="block-loading">
              <div id="loader-container">
                <div className="loader"></div>
              </div>
              <div className="state-testing">
                Test is in progress, please wait<span className="one">.</span>
                <span className="two">.</span>
                <span className="three">.</span>​
              </div>
            </div>
          )
        )}
      </div>
    );
  }
}

VoxeetConferencePreCall.propTypes = {
  accessToken: PropTypes.string,
  audioOnly: PropTypes.bool.isRequired,
};

VoxeetConferencePreCall.defaultProps = {};

export default VoxeetConferencePreCall;
