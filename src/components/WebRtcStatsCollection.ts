import { EventEmitter } from 'events';
import VoxeetSDK from "@voxeet/voxeet-web-sdk";

type Stats = {
  type: string;
  timestamp: number;
};

type RTCOutboundRtpStats = {
  mediaType: string;

  ssrc: number;
  trackId: string;
} & Stats;

type RTCOutboundRtpAudioStreamStats = {
  packetsSent: number;
  bytesSent: number;
  retransmittedPacketsSent: number;
  retransmittedBytesSent: number;
  targetBitrate: number;
} & RTCOutboundRtpStats;

type RTCOutboundRtpVideoStreamStats = {
  packetsSent: number;
  bytesSent: number;
  bitrateSent: number;
  retransmittedPacketsSent: number;
  retransmittedBytesSent: number;
  contentType: string;
  nackCount: number;
  firCount: number;
  pliCount: number;
  qualityLimitationReason: string;
  framesEncoded: number;
  framesSent: number;
  frameWidth: number;
  frameHeight: number;
  framesPerSecond: number;
  keyFramesEncoded: number;
  totalPacketSendDelay: number;
  encoderImplementation: string;
  qpSum: number;
  targetBitrate: number;
} & RTCOutboundRtpStats;

declare type Statistics = RTCOutboundRtpAudioStreamStats | RTCOutboundRtpVideoStreamStats;

declare type WebRTCStats = Map<string, Array<Statistics>>;

export type AudioOutputCollect = {
  timestamp: number;
  totalBytes?: number;
  totalPackets?: number;
  bitrate?: number;
  packetRate?: number;
  targetBitrate?: number;
  retransmittedPacketsSent?: number;
  retransmittedBytesSent?: number;
};

export type VideoOutputCollect = {
  timestamp: number;
  totalBytes?: number;
  totalPackets?: number;
  bitrate?: number;
  packetRate?: number;
  targetBitrate?: number;
  retransmittedPacketsSent?: number;
  retransmittedBytesSent?: number;

  frameWidth?: number;
  frameHeight?: number;
  framesPerSecond?: number;
  framesSent?: number;
};

export type OnCollectReady = {
  audioOutput: AudioOutputCollect;
  videoOutput: VideoOutputCollect;
};

class WebRTCStatsCollection extends EventEmitter {
  #intervalId: NodeJS.Timer | null = null;
  #rawData: Statistics[][] = [];

  #timestampAudioOutput: number = 0;
  #totalBytesSentAudio: number = 0;
  #totalPacketsSentAudio: number = 0;

  #timestampVideoOutput: number = 0;
  #totalBytesSentVideo: number = 0;
  #totalPacketsSentVideo: number = 0;

  #audioOutputCollections: AudioOutputCollect[] = [];
  #videoOutputCollections: VideoOutputCollect[] = [];

  public startCollection = (rate: number = 1000) => {
    this.#rawData = [];
    this.#timestampAudioOutput = 0;
    this.#totalBytesSentAudio = 0;
    this.#totalPacketsSentAudio = 0;
    this.#timestampVideoOutput = 0;
    this.#totalBytesSentVideo = 0;
    this.#totalPacketsSentVideo = 0;
    this.#audioOutputCollections = [];
    this.#videoOutputCollections = [];

    this.#intervalId = setInterval(this.getStats, rate);
  };

  public stopCollection = () => {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  };

  private getStats = async () =>{
    const webRTCStats: WebRTCStats = (await VoxeetSDK.conference.localStats()) as WebRTCStats;

    // Only consider the local participant
    const statistics: Statistics[] = Array.from(webRTCStats.values())[0];
    this.#rawData.push(statistics);

    var audioOutput: AudioOutputCollect | null = null;
    var videoOutput: VideoOutputCollect | null = null;

    for (let i = 0; i < Object.keys(statistics).length; i++) {
      const entry: Statistics = statistics[i];

      if (entry.type === 'outbound-rtp') {
        if (entry.mediaType === 'audio' && entry.timestamp - this.#timestampAudioOutput > 0) {
          const bitrate = (entry.bytesSent - this.#totalBytesSentAudio) / ((entry.timestamp - this.#timestampAudioOutput) / 1000);
          const packetRate = (entry.packetsSent - this.#totalPacketsSentAudio) / ((entry.timestamp - this.#timestampAudioOutput) / 1000);
          this.#timestampAudioOutput = entry.timestamp;
          this.#totalBytesSentAudio = entry.bytesSent;
          this.#totalPacketsSentAudio = entry.packetsSent;

          audioOutput = {
            timestamp: entry.timestamp,
            totalBytes: entry.bytesSent,
            totalPackets: entry.packetsSent,
            bitrate: bitrate,
            packetRate: packetRate,
            targetBitrate: entry.targetBitrate,
            retransmittedPacketsSent: entry.retransmittedPacketsSent,
            retransmittedBytesSent: entry.retransmittedBytesSent,
          };
        } else if (entry.mediaType === 'video' && entry.timestamp - this.#timestampVideoOutput > 0) {
          const vEntry: RTCOutboundRtpVideoStreamStats = entry as RTCOutboundRtpVideoStreamStats;
          const bitrate = (entry.bytesSent - this.#totalBytesSentVideo) / ((entry.timestamp - this.#timestampVideoOutput) / 1000);
          const packetRate = (entry.packetsSent - this.#totalPacketsSentVideo) / ((entry.timestamp - this.#timestampVideoOutput) / 1000);
          this.#timestampVideoOutput = entry.timestamp;
          this.#totalBytesSentVideo = entry.bytesSent;
          this.#totalPacketsSentVideo = entry.packetsSent;

          videoOutput = {
            timestamp: entry.timestamp,
            totalBytes: entry.bytesSent,
            totalPackets: entry.packetsSent,
            bitrate: bitrate,
            packetRate: packetRate,
            targetBitrate: entry.targetBitrate,
            retransmittedPacketsSent: entry.retransmittedPacketsSent,
            retransmittedBytesSent: entry.retransmittedBytesSent,
            frameWidth: vEntry.frameWidth,
            frameHeight: vEntry.frameHeight,
            framesPerSecond: vEntry.framesPerSecond,
            framesSent: vEntry.framesSent,
          };
        }
      }

    }

    if (audioOutput != null) {
      this.#audioOutputCollections.push(audioOutput);
    }
    if (videoOutput != null) {
      this.#videoOutputCollections.push(videoOutput);
    }
    this.emit('collection', { audioOutput, videoOutput });
  };
};

export default WebRTCStatsCollection;
