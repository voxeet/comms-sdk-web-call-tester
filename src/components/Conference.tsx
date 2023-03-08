import React, { useState, useEffect, useRef } from "react";
import "../assets/css/call-tester.less";
import logo from "../assets/images/logo.png";
import AudioVuMeter from "./AudioVuMeter";
import { Chart, registerables, LineControllerChartOptions } from "chart.js";
import Bowser from "bowser";

import VoxeetSDK from "@voxeet/voxeet-web-sdk";
import WebRTCStats from "@dolbyio/webrtc-stats";
import { OnStats } from "@dolbyio/webrtc-stats/dist/types/WebRTCStats";

type ConferenceProps = {
  accessToken: string;
  audioOnlyTest: boolean;
};

var bitrateAudioChart: Chart | null = null;
var bitrateVideoChart: Chart | null = null;
var collection: WebRTCStats;

const Conference = ({
  accessToken = '',
  audioOnlyTest = false,
}: ConferenceProps) => {

  const [error, setError] = useState<string | null>(null);
  const [endTesting, setEndTesting] = useState(false);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [videoHeight, setVideoHeight] = useState(480);
  const [videoWidth, setVideoWidth] = useState(640);
  const [isValidBrowser, setIsValidBrowser] = useState(true);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [audioOnly, setAudioOnly] = useState(audioOnlyTest);
  const [initialized, setInitialized] = useState(false);
  const [npmLink, setNpmLink] = useState('');
  const [sdkVersion, setSdkVersion] = useState('');
  const [nextTestAudioOnly, setNextTestAudioOnly] = useState(audioOnly);
  const [sessionOpenState, setSessionOpenState] = useState(false);
  const [joinConferenceState, setJoinConferenceState] = useState(false);
  const [createConferenceState, setCreateConferenceState] = useState(false);
  const [leaveConferenceState, setLeaveConferenceState] = useState(false);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);

  var videoElement = useRef<HTMLVideoElement>(null);
  var bitrateAudioElement = useRef<HTMLCanvasElement>(null);
  var bitrateVideoElement = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!initialized) {
      Chart.register(...registerables);
      initializeConference();
    }
  }, []);

  const initializeConference = async () => {
    VoxeetSDK.initializeToken(accessToken, () => new Promise((resolve) => resolve(accessToken)));

    await startCallTest();
    setInitialized(true);
    setSdkVersion(VoxeetSDK.version);
    setNpmLink(`https://www.npmjs.com/package/@voxeet/voxeet-web-sdk/v/${VoxeetSDK.version}`);
  };

  const handleChangeAudioOnly = () => {
    setNextTestAudioOnly(!nextTestAudioOnly);
  };

  const startCallTest = async () => {
    if (!VoxeetSDK.session.participant) {
      const userInfo = { name: "call-tester", externalId: "call-tester" };
      await VoxeetSDK.session.open(userInfo);
      setSessionOpenState(true);
    }

    await runTest();
  };

  useEffect(() => {
    collection = new WebRTCStats({
      getStatsInterval: 1000,
      getStats: async () => {
        const webRTCStats = await VoxeetSDK.conference.localStats();

        // Convert the WebRTCStats object to RTCStatsReport
        const values = Array.from(webRTCStats.values())[0];
        const map = new Map();
        for (let i = 0; i < values.length; i++) {
            const element: any = values[i];
            map.set(element.id, element);
        }
        return map;
      },
    });
    collection.on('stats', collectionReady);

    return () => {
      collection.removeListener('stats', collectionReady);
    }
  }, []);

  const runTest = async () => {
    setAudioOnly(nextTestAudioOnly);
    const constraints = {
      audio: true,
      video: nextTestAudioOnly ? false : true
    };
    var alreadyStarted = constraints.video;

    const conference = await VoxeetSDK.conference.create({
      alias: "call-tester-" + Math.floor(Math.random() * 1001),
      params: {
        stats: true,
        dolbyVoice: true,
      }
    });

    setCreateConferenceState(true);

    VoxeetSDK.conference.on("participantUpdated", async () => {
      if (!alreadyStarted && !audioOnly) {
        alreadyStarted = true;
        const videoConstraints: any = {
          mandatory: {
            minWidth: 640,
            minHeight: 480,
            maxWidth: 1920,
            maxHeight: 1080,
            minFrameRate: 10,
            maxFrameRate: 30
          }
        };

        try {
          await VoxeetSDK.video.local.start(videoConstraints);
          console.log("Video started");
        } catch (error) {
          console.error(error);
        }
      }
    });

    const joinOptions = {
      constraints: constraints,
      dvwc: false, // DVWC does not expose audio stats
    };
    
    try {
      await VoxeetSDK.conference.join(conference, joinOptions);

      const optionsBitrate: LineControllerChartOptions & any = {
        showLine: true,
        spanGaps: true,
        animation: false,
        plugins: {
          legend: {
              display: false,
          }
        },
        draggable: true,
        scales: {
          y: {
            title: {
              display: true,
              text: 'kbps',
              font: {
                family: "Open Sans",
                size: 14,
              },
            },
            ticks: {
              display: true,
              beginAtZero: true,
              min: 0,
              font: {
                family: "Open Sans",
                size: 14,
              },
            }
          },
          x: {
            title: {
              display: true,
              text: 'time',
              font: {
                family: "Open Sans",
                size: 14,
              },
            },
          }
        }
      };

      if (!bitrateAudioChart) {
        bitrateAudioChart = new Chart(bitrateAudioElement.current!, {
          type: "line",
          data: {
            datasets: [
              {
                label: "bitrate_audio",
                data: [],
                pointBorderWidth: 3,
                fill: false,
                borderColor: "#e57373",
                pointBorderColor: "#e57373",
                pointBackgroundColor: "#e57373",
                pointHoverRadius: 3,
                pointHoverBorderWidth: 1,
                pointRadius: 3,
                borderWidth: 1,
              }
            ],
          },
          options: optionsBitrate,
        });
      } else {
        bitrateAudioChart.data.labels = [];
        bitrateAudioChart.data.datasets.forEach((ds) => ds.data = []);
        bitrateAudioChart.update();
      }

      if (!nextTestAudioOnly) {
        if (!bitrateVideoChart) {
          bitrateVideoChart = new Chart(bitrateVideoElement.current!, {
            type: "line",
            data: {
              datasets: [
                {
                  label: "bitrate_video",
                  data: [],
                  pointBorderWidth: 3,
                  borderColor: "#e57373",
                  pointBorderColor: "#e57373",
                  pointBackgroundColor: "#e57373",
                  fill: false,
                  pointHoverRadius: 3,
                  pointHoverBorderWidth: 1,
                  pointRadius: 3,
                  borderWidth: 1,
                }
              ],
            },
            options: optionsBitrate,
          });
        } else {
          bitrateVideoChart.data.labels = [];
          bitrateVideoChart.data.datasets.forEach((ds) => ds.data = []);
          bitrateVideoChart.update();
        }
      }

      collection?.start();
      setJoinConferenceState(true);
      setAudioOnly(nextTestAudioOnly);
      
      setTimeout(async () => {
        const browser = Bowser.getParser(window.navigator.userAgent);
        const _browserInfo = browser.getBrowser();
        const _isValidBrowser = browser.satisfies({
          chrome: ">65",
          firefox: ">60",
          edge: ">17",
          safari: ">11",
          opera: ">57"
        });

        collection?.stop();
        setEndTesting(true);
        setIsValidBrowser(_isValidBrowser!);
        setBrowserInfo(_browserInfo);

        const _audioInputDevices = await VoxeetSDK.mediaDevice.enumerateAudioInputDevices();
        setAudioDevices(_audioInputDevices);
        const _audioOutputDevices = await VoxeetSDK.mediaDevice.enumerateAudioOutputDevices();
        setOutputDevices(_audioOutputDevices);
        const _videoDevices = await VoxeetSDK.mediaDevice.enumerateVideoInputDevices();
        setVideoDevices(_videoDevices);

        await VoxeetSDK.conference.leave();

        setLeaveConferenceState(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: !audioOnly
        });

        if (!audioOnly && videoElement.current) {
          const nav: any = navigator;
          nav.attachMediaStream(videoElement.current, stream);
          setVideoHeight(stream.getVideoTracks()[0].getSettings().height!);
          setVideoWidth(stream.getVideoTracks()[0].getSettings().width!);
        }
        setUserStream(stream);

        stream.getTracks().forEach(track => {
          if ("video" == track.kind) {
            setSelectedVideoDevice(_videoDevices.find((d) => track.label === d.label)?.deviceId ?? '');
          } else if ("audio" == track.kind) {
            setSelectedAudioDevice(_audioInputDevices.find((d) => track.label === d.label)?.deviceId ?? '');
          }
        });
      }, 15000);
    } catch (error) {
      setError("An error occurred during joining the conference, please make sure that devices are allowed.");
      console.error(error);
      setEndTesting(true);
    }
  }

  const reStartTesting = async () => {
    setEndTesting(false);
    setError(null);
    userStream?.getTracks().forEach((t) => t.stop());
    setUserStream(null);
    setAudioDevices([]);
    setSelectedAudioDevice(null);
    setOutputDevices([]);
    setVideoDevices([]);
    setSelectedVideoDevice(null);
    setVideoHeight(480);
    setVideoWidth(640);
    setCreateConferenceState(false);
    setJoinConferenceState(false)
    setLeaveConferenceState(false);

    if (initialized) {
      await startCallTest();
    } else {
      initializeConference();
    }
  };
  
  const collectionReady = (event: OnStats) => {
    if (event.output.audio.length && bitrateAudioChart) {
      const audioOutput = event.output.audio[0];
      const timeStr = new Date(audioOutput.timestamp).toLocaleTimeString();
      bitrateAudioChart.data.labels!.push(timeStr);
      bitrateAudioChart.data.datasets.forEach((dataset: any) => {
        dataset.data.push((audioOutput.bitrate ?? 0) * 8 / 1024);
      });
      bitrateAudioChart!.update();
    }
    if (event.output.video.length && bitrateVideoChart) {
      const videoOutput = event.output.video[0];
      const timeStr = new Date(videoOutput.timestamp).toLocaleTimeString();
      bitrateVideoChart.data.labels!.push(timeStr);
      bitrateVideoChart.data.datasets.forEach((dataset: any) => {
        dataset.data.push((videoOutput.bitrate ?? 0) * 8 / 1024);
      });
      bitrateVideoChart.update();
    }
  };

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
              checked={nextTestAudioOnly}
              onChange={handleChangeAudioOnly}
            />
            <label id="audioOnlyLabel" htmlFor="audioOnly">
              Audio Only
            </label>
          </div>
          <div className="container-start-test">
            <button onClick={reStartTesting} className="btn">
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
            <canvas width="50%" height="40" ref={bitrateAudioElement}></canvas>
          </div>
          {!audioOnly && (
            <div className="container-graph">
              <div className="title-graph">Video bitrate</div>
              <canvas width="50%" height="40" ref={bitrateVideoElement}></canvas>
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
                    {isValidBrowser ? (
                      <div>👍</div>
                    ) : (
                      <div>👎</div>
                    )}
                  </div>
                </li>
                <li>
                  <div className="title">Browser name</div>
                  <div>
                    {browserInfo && browserInfo.name}
                  </div>
                </li>
                <li>
                  <div className="title">Platform</div>
                  <div>{navigator.platform}</div>
                </li>
                <li>
                  <div className="title">Browser version</div>
                  <div>
                    {browserInfo && browserInfo.version}
                  </div>
                </li>
                <li>
                  <div className="title">Voxeet SDK version</div>
                  <div>
                    <a target="_blank" href={npmLink}>{sdkVersion}</a>
                  </div>
                </li>
              </ul>
            </div>

            <div className="block">
              <div className="title-section">Hardware Setup Audio</div>
              <div className="contain-audio">
                <div className="container-input">
                  <label htmlFor="audioDevices">Microphone:</label>
                  <ul id="audioDevices">
                    {audioDevices.map((device, i) => (
                      selectedAudioDevice == device.deviceId ? (
                        <li key={device.label}>✅ {device.label}</li>
                      ) : (
                        <li key={device.label}>❌ {device.label}</li>
                      )
                    ))}
                    <li>
                      <AudioVuMeter audioStream={userStream} />
                    </li>
                  </ul>
                </div>

                {browserInfo.name == "Chrome" && (
                  <div className="container-output">
                    <label htmlFor="video">Output :</label>
                    <select
                      name="output"
                      className="form-control"
                      disabled={true}
                    >
                      {outputDevices.map((device, i) => (
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

          {!audioOnly && (
            <div className="block">
              <div className="title-section">Hardware Setup Video</div>
              <div className="container-video">
                <video
                  className="video-participant"
                  width="360"
                  id="video-settings"
                  playsInline
                  height="280"
                  ref={videoElement}
                  autoPlay
                  muted
                />
              </div>
              <div className="form-group">
                <div>
                  <label htmlFor="videoDevices">Camera:</label>
                  <ul id="videoDevices">
                    {videoDevices.map((device, i) => (
                      selectedVideoDevice == device.deviceId ? (
                        <li key={device.label}>✅ {device.label}</li>
                      ) : (
                        <li key={device.label}>❌ {device.label}</li>
                      )
                    ))}
                  </ul>
                </div>
                <div>
                  Resolution: {videoWidth}x{videoHeight}
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
                  {sessionOpenState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Create the conference</div>
                <div>
                  {createConferenceState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Join the conference</div>
                <div>
                  {joinConferenceState ? (
                    <div>👍</div>
                  ) : (
                    <div>👎</div>
                  )}
                </div>
              </li>
              <li>
                <div className="title">Leave the conference</div>
                <div>
                  {leaveConferenceState ? (
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

export default Conference;
