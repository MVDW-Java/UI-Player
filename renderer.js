const remote = require('electron').remote;
var fs = require('fs');
import { Brstm } from './lib/nikku/brstm/index.js';
import { AudioPlayer } from './lib/nikku/audioPlayer.js';

const DiscordRPC = require('discord-rpc');
const Youtube = require('youtube-stream-url');

const clientId = '761185322192732200';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });


var discord_details = "Idle.";
var discord_file = "Idle.";
var discord_time = new Date();
var discord_filetype = "none";
var discord_playstate = "play";


async function setActivity() {
  if (!rpc) {
    return;
  }

  rpc.setActivity({
    details: discord_details,
    state: discord_file,
    endTimestamp: discord_time,
    largeImageKey: discord_filetype,
    largeImageText: 'Playing a BRSTM file.',
    smallImageKey: 'play',
    smallImageText: 'Playing...',
    instance: false,
  });
}
rpc.on('ready', () => {
  setActivity();

  // activity can only be set every 15 seconds
  setInterval(() => {
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).catch(console.error);








let audioPlayer = new Audio();
const elTime = document.getElementById('controls-time');
const elPlayPause = document.getElementById('controls-play-pause');
const elLoop = document.getElementById('controls-loop');
const elVolume = document.getElementById('controls-volume');
const elTimeCurrent = document.getElementById('controls-time-current');
const elTimeAmount = document.getElementById('controls-time-amount');
const elStreamSelect = document.getElementById('controls-stream-select');
const elErrors = document.getElementById('errors');


const buttonMuteUnmute = document.getElementById('controls-mute-unmute');


const main = document.getElementById('main');
const menu = document.getElementById('controls-menu');

const videoPlayer = document.getElementById('video-player');
const videoSource = document.getElementById('video-source');
const audioPlayer_um = document.getElementById('audio-player');
const audioSource = document.getElementById('audio-source');
const imagePlayer = document.getElementById('image-player');

const screenLogo = document.getElementById('screen-logo');

let currentTimeRenderAf = null;
let shouldCurrentTimeRender = false;
let isElTimeDragging = false;
let streamStates = [true];
let looped = false;
let hidemenu_timer = 3;
let mediaType = 0; // 0 = nothing playing, 1 = nikku engine, 2 = default video engine, 3 = default audio engine;
let muted = false;
let filepath;


document.addEventListener('DOMContentLoaded', () => {


	// Timers
	setInterval(hidemenu, 1000);



	//Menu Events
	document.ondragover = document.ondrop = (ev) => {
		ev.preventDefault()
	}

	document.body.ondrop = (ev) => {
		if(ev.dataTransfer.getData("Text")){
			Play_File(ev.dataTransfer.getData("Text"), 2);
		} else {
			Play_File(ev.dataTransfer.files[0].path, 1)
		}
		ev.preventDefault()
	}
	
	document.addEventListener('mousemove', e => {
		if(mediaType == 5) return;
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
	});
	

	document.addEventListener('wheel', e => {
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
		
		if(Math.sign(e.deltaY) == -1) elVolume.value = parseInt(elVolume.value) + 5;
		if(Math.sign(e.deltaY) == 1) elVolume.value = parseInt(elVolume.value) - 5;
	
		if(mediaType == 1){
			audioPlayer.setVolume(elVolume.value / 100);
			
		} else if(mediaType == 2){
			videoPlayer.volume = elVolume.value / 100;
		} else if(mediaType == 3){
			audioPlayer.volume = elVolume.value / 100;
		} 
	});
	
	
	
	elVolume.addEventListener('input', (e) => {
		e.preventDefault();
		e.stopPropagation();
			
		if(mediaType == 1){
			audioPlayer.setVolume(elVolume.value / 100);
		} else if(mediaType == 2){
			videoPlayer.volume = elVolume.value / 100;
		} else if(mediaType == 3){
			audioPlayer.volume = elVolume.value / 100;
		} 
	});
	
	
	buttonMuteUnmute.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if(muted){
			muted = false;
			buttonMuteUnmute.src = "assets/png/mute.png";
			if(mediaType == 1){
				audioPlayer.setVolume(elVolume.value / 100);
			} else if(mediaType == 2){
				videoPlayer.volume = elVolume.value / 100;
			} else if(mediaType == 3){
				audioPlayer.volume = elVolume.value / 100;
			}
		} else {
			muted = true;
			buttonMuteUnmute.src = "assets/png/unmute.png";
			if(mediaType == 1){
				audioPlayer.setVolume(0);
			} else if(mediaType == 2){
				videoPlayer.volume = 0;
			} else if(mediaType == 3){
				audioPlayer.volume = 0;
			}
		}
	});
	
	elPlayPause.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
			
		if(mediaType == 1){
			
			if (audioPlayer.isPlaying) {
				audioPlayer.pause();
				stopRenderCurrentTime();
				disableStreamCheckboxes();
			} else {
				audioPlayer.play();
				startRenderCurrentTime();
				enableStreamCheckboxes();
			}
		} else if(mediaType == 2){
			if (videoPlayer.paused) {
				elPlayPause.src = "assets/png/pause.png";
				videoPlayer.play();
			} else {
				elPlayPause.src = "assets/png/play.png";
				videoPlayer.pause();
			}
		} else if(mediaType == 3){ 
			if (audioPlayer.paused) {
				elPlayPause.src = "assets/png/pause.png";
				audioPlayer.play();
			} else {
				elPlayPause.src = "assets/png/play.png";
				audioPlayer.pause();
			}
		} else if(mediaType == 4){ 
			if (audioPlayer.paused) {
				elPlayPause.src = "assets/png/pause.png";
				audioPlayer.play();
				videoPlayer.play();
				audioPlayer.currentTime = videoPlayer.currentTime;
			} else {
				elPlayPause.src = "assets/png/play.png";
				audioPlayer.pause();
				videoPlayer.pause();
				audioPlayer.currentTime = videoPlayer.currentTime;
			}
		}
	});
	
	
	
	videoPlayer.addEventListener('click', (e) => {
		if (videoPlayer.paused) {
			elPlayPause.src = "assets/png/pause.png";
			videoPlayer.play();
			if(mediaType == 4){ 
				audioPlayer.play();
				audioPlayer.currentTime = videoPlayer.currentTime;
			}
		} else {
			elPlayPause.src = "assets/png/play.png";
			videoPlayer.pause();
			if(mediaType == 4){ 
				audioPlayer.pause();
				audioPlayer.currentTime = videoPlayer.currentTime;
			}
		}
	});
	
	
	elLoop.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			if(looped){
				looped = false;
				elLoop.src = "assets/png/loop_off.png";
			
			} else {
				looped = true;
				elLoop.src = "assets/png/loop_on.png";
			}
			if(mediaType == 1){
				audioPlayer.setLoop(looped);
			}

	});

	let isElTimeDraggingTimeoutId = null;
	elTime.addEventListener('input', (e) => {
		e.preventDefault();
		e.stopPropagation();

			
		isElTimeDragging = true;
		if (isElTimeDraggingTimeoutId) {
			clearTimeout(isElTimeDraggingTimeoutId);
		}
			
		// Make sure targetTimeInMs is at most "xx.xx" (chop off the 0.00000000000001 floating point error)
		isElTimeDraggingTimeoutId = setTimeout(() => {
			isElTimeDragging = false;
			if(mediaType == 1){
				audioPlayer.seek(Math.round(parseFloat(e.target.value) * 1000 + 150) / 1000);
			} else if(mediaType == 2){
				videoPlayer.currentTime = videoPlayer.duration * e.target.value / 100;
				videoPlayer.play();
			} else if(mediaType == 3){
				audioPlayer.currentTime = audioPlayer.duration * e.target.value / 100;
				audioPlayer.play();
				elPlayPause.src = "assets/png/pause.png";
			} else if(mediaType == 4){
				audioPlayer.currentTime = audioPlayer.duration * e.target.value / 100;
				videoPlayer.currentTime = audioPlayer.duration * e.target.value / 100;
				audioPlayer.play();
				videoPlayer.play();
				
				audioPlayer.currentTime = videoPlayer.currentTime;
			}
			startRenderCurrentTime();
			
		}, 150);
	});
	
	
	
	window.addEventListener('keydown', e => {
		
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
		
		console.log(e.keyCode);
		if(e.keyCode == 189){
			rpc.destroy();
		
		} else if(e.keyCode == 32){
			if(mediaType == 1){
				
				if (audioPlayer.isPlaying) {
					audioPlayer.pause();
					stopRenderCurrentTime();
					disableStreamCheckboxes();
				} else {
					audioPlayer.play();
					startRenderCurrentTime();
					enableStreamCheckboxes();
				}
			} else if(mediaType == 2){
				
				if (videoPlayer.paused) {
					elPlayPause.src = "assets/png/pause.png";
					videoPlayer.play();
				} else {
					elPlayPause.src = "assets/png/play.png";
					videoPlayer.pause();
				}
			} else if(mediaType == 3){
				
				if (audioPlayer.paused) {
					elPlayPause.src = "assets/png/pause.png";
					audioPlayer.play();
				} else {
					elPlayPause.src = "assets/png/play.png";
					audioPlayer.pause();
				}
			} else if(mediaType == 4){
				
				if (audioPlayer.paused) {
					elPlayPause.src = "assets/png/pause.png";
					audioPlayer.play();
					videoPlayer.play();
					audioPlayer.currentTime = videoPlayer.currentTime;
				} else {
					elPlayPause.src = "assets/png/play.png";
					audioPlayer.pause();
					videoPlayer.pause();
					audioPlayer.currentTime = videoPlayer.currentTime;
				}
			}
		} else if(e.keyCode == 38){
			
			elVolume.value = parseInt(elVolume.value) + 5;
	
			if(mediaType == 1){
				audioPlayer.setVolume(elVolume.value / 100);
			} else if(mediaType == 2){
				videoPlayer.volume = elVolume.value / 100;
			}
		} else if(e.keyCode == 40){
			
			elVolume.value = parseInt(elVolume.value) - 5;
	
			if(mediaType == 1){
				audioPlayer.setVolume(elVolume.value / 100);
			} else if(mediaType == 2){
				videoPlayer.volume = elVolume.value / 100;
			}
		} else if(e.keyCode == 39){
			
			if(mediaType == 1){
				audioPlayer.seek(audioPlayer.getCurrrentPlaybackTime() + 5);
			} else if(mediaType == 2){
				videoPlayer.currentTime = parseFloat(videoPlayer.currentTime) + 5;
			}
			
			
		} else if(e.keyCode == 37){
			
			if(mediaType == 1){
				audioPlayer.seek(audioPlayer.getCurrrentPlaybackTime() - 5);
			} else if(mediaType == 2){
				videoPlayer.currentTime = parseFloat(videoPlayer.currentTime) - 5;
			}
			
			
		}
		
	});
	
	
	
	videoPlayer.addEventListener('ended', (e) => {
		if(looped){
			e.target.currentTime = 0;
			e.target.play();
		} else {
			elPlayPause.src = "assets/png/replay.png";
		}
	});
	

	
	function hidemenu() {
		if(mediaType == 5) return;
		if(hidemenu_timer == 0){
			menu.style.display = "none";
			menu.style.cursor = "none !important";
		} else {
			hidemenu_timer--;
		}
	}

	
	
	if (remote.process.argv.length >= 2) {
		console.log(remote.process.argv);
		if(remote.process.argv[1] != "."){
			
			Play_File(remote.process.argv[1], 1);
			
			
		} else {
			Reset_Screen();
		}
	}

	async function Play_File(path, type){
		

		Reset_Screen();
		
		if(type == 1){
			var file_name = path.split('\\').pop().split('/').pop();
			var file_ext = file_name.split('.').pop().toLowerCase();

			
			switch(file_ext){
				case "brstm":
					mediaType = 1;
					Play_BRSTM(path, file_name);
					document.title = "UI-Player | Playing music - " + file_name;
					discord_details = "Listening to Music";
					discord_file = file_name;
					discord_time = new Date();
					discord_filetype = file_ext;
					
					break;
				case "mp4":
				case "avi":
				case "mkv":
				case "mov":
				case "webm":
					mediaType = 2;
					Play_Video(path, file_name);
					document.title = "UI-Player | Playing video - " + file_name;
					discord_details = "Github:";
					discord_file = "MVDW-Java/UI-Player";
					                
					discord_filetype = "mp4";
					break;
				case "mp3":
				case "wav":
				case "ogg":
				case "flac":
					mediaType = 3;
					playAudio(path);
					document.title = "UI-Player | Playing music - " + file_name;
					discord_details = "Listening to Music";
					discord_file = file_name;
					discord_filetype = "mp4";
					break;
				case "png":
				case "jpg":
				case "gif":
				case "jpeg":
				case "jfif":
				case "bmp":
					mediaType = 5;
					playImage(path);
					break;
			}
		} else {
			mediaType = 4;
			document.title = "UI-Player | Playing YouTube";
			discord_details = "Watching YouTube";
			discord_file = "Soon(tm)";
			discord_filetype = "mp4";
			Youtube.getInfo({url: path}).then(video => {
				
				//What is the best quality:
				var bestVideo = "";
				var bestAudio = "";
				
				//Compair values:
				var bestWidth = 0;
				var bestHeight = 0;
				var bestSample = 0;
				var i;
				
				for (i = 0; i < video.formats.length; i++) { 
				
					if(video.formats[i].width >= bestWidth && video.formats[i].height >= bestHeight){
						bestVideo = video.formats[i].url;
						bestWidth = video.formats[i].width;
						bestHeight =video.formats[i].height;

					}
					
					if(video.formats[i].audioSampleRate >= bestSample){
						bestAudio = video.formats[i].url;
						bestSample = video.formats[i].audioSampleRate;
					}
					
					
				}
				
				console.log(video.formats);
				console.log("BEST AUDIO: " + bestAudio);
				if(bestAudio == ""){
					console.log("Audio already included!");
					Play_Video(bestVideo, "YouTube");
				} else {
					console.log("Play audio with it...");
					Play_Video(bestVideo, "YouTube", true);
					playAudio(bestAudio, "YouTube");
					
				}
				//playAudio(video.formats[22].url, "YouTube");
			});
			
			
		}
	}


	async function playImage(path){
		screenLogo.style.display = "none";
		imagePlayer.style.display = "block";
		menu.style.display = "none";
		menu.style.cursor = "none !important";
		imagePlayer.setAttribute('src', path);
		
	}



	async function playAudio(path){
		filepath = path;
		
		var dir = require('path').dirname(path);
		console.log(dir);
		audioPlayer = new Audio(filepath);
		
		try {
			if(fs.existsSync(dir + "\\Cover.jpg")) {
				screenLogo.src = dir + "\\Cover.jpg";
			} else if(fs.existsSync(dir + "\\Folder.jpg")) {
				screenLogo.src = dir + "\\Folder.jpg";
			}
		} catch (err) {
			console.error(err);
		}
		
		audioPlayer.addEventListener('ended', (e) => {
			if(looped){
				audioPlayer = new Audio(filepath);
				audioPlayer.currentTime = 0;
				audioPlayer.play();
			} else {
				elPlayPause.src = "assets/png/replay.png";
			}
		});
		
		
		
		
		
		
		
		
		if(muted){
			audioPlayer.volume = 0;
		} else {
			audioPlayer.volume = elVolume.value / 100;
		}

		
		elPlayPause.src = "assets/png/pause.png";
		
		audioPlayer.play();
		
		
		audioPlayer.addEventListener('canplay', (e) => {
			elTimeAmount.textContent = formatTime(audioPlayer.duration);
			discord_time = new Date();
			discord_time.setSeconds(discord_time.getSeconds() + audioPlayer.duration);
		});
		


		startRenderCurrentTime();
	}

	async function Play_Video(path_full, file_name, single_muted = false){
		
		videoPlayer.style.display = "block";
		screenLogo.style.display = "none";
		videoSource.setAttribute('src', path_full);
		videoPlayer.load();
		

		if (videoPlayer.textTracks) {
			console.log("VP: " + videoPlayer.textTracks.length);
			for (var i = 0; i < videoPlayer.textTracks.length; i++) {
				console.log("[DEBUG][TRACKS]:" + videoPlayer.textTracks[i].language + " :: " + videoPlayer.textTracks[i].label);
			}
		}
		
		
		
		
		
		if(muted){
			videoPlayer.volume = 0;
		} else {
			videoPlayer.volume = elVolume.value / 100;
		}
		if(single_muted){
			videoPlayer.volume = 0;
		};
		
		for (var i = 0; i < videoPlayer.textTracks.length; i++) {
			videoPlayer.textTracks[i].mode = 'showing';
		}

		videoPlayer.play();
		
		
		
		
		elPlayPause.src = "assets/png/pause.png";

		
		videoPlayer.addEventListener('canplay', (e) => {
			elTimeAmount.textContent = formatTime(videoPlayer.duration);
			discord_time = new Date();
			discord_time.setSeconds(discord_time.getSeconds() + videoPlayer.duration);
		});
		
		startRenderCurrentTime();
	}
	
	
	function Reset_Screen(){
		if(mediaType == 1){
			if(audioPlayer) {
				audioPlayer.destroy();
			}
		} else if(mediaType == 2) {
			videoSource.setAttribute('src', "");
			videoPlayer.load();
			videoPlayer.style.display = "none";
			screenLogo.style.display = "block";
		} else if(mediaType == 3) {
			screenLogo.src = "assets/png/logo.png";
			audioPlayer.pause();
			audioPlayer = null;
		} else if(mediaType == 4){
			//Reset 4
			
		} else if(mediaType == 5){
			screenLogo.style.display = "block";
			imagePlayer.style.display = "none";
			menu.style.display = "block";
			menu.style.cursor = "default";
			imagePlayer.setAttribute('src', "");

		}
	}
	
	
	
	//Play_BRSTM("D:/Documents/GitHub/UI-Player/aa.brstm", "aa.brstm");
	async function Play_BRSTM(path_full, file_name){
		
		
		fs.readFile(path_full, async (err, data) => {
			try {
				elErrors.textContent = '';

				const brstm = new Brstm(data);

				audioPlayer = new AudioPlayer(brstm.metadata, {
					onPlay: () => {
						elPlayPause.src = "assets/png/pause.png";
					},
					onPause: () => {
						elPlayPause.src = "assets/png/play.png";
					},
				});

				// From Nikku Dev: This seems slow, taking around 200ms
				const allSamples = brstm.getAllSamples();

				await audioPlayer.readyPromise;
				audioPlayer.load(allSamples);



				// Reset elStreamSelect
				elStreamSelect.removeAttribute('style');
				elStreamSelect.setAttribute('tabindex', 0);
				elStreamSelect.innerHTML = '';

				if (brstm.metadata.numberChannels > 2) {
					const numberStreams = Math.floor(brstm.metadata.numberChannels / 2);
					const text = document.createElement('span');
					text.textContent = 'Stream(s) enabled:';
					text.title = 'This file contains more than 1 streams, check or uncheck the checkboxes to enable/disable each stream';
					elStreamSelect.appendChild(text);
					streamStates = [];
					
					for (let i = 0; i < numberStreams; i++) {
						const child = document.createElement('input');
						child.type = 'checkbox';
						if (i === 0) {
							child.checked = true;
							streamStates.push(true);
						} else {
							child.checked = false;
							streamStates.push(false);
						}
						child.title = `Stream ${i + 1}`;
						child.addEventListener('input', streamCheckedHandler.bind(this, i));
						elStreamSelect.appendChild(child);
					}
					elStreamSelect.style.display = 'block';
				}

				const amountTimeInS = brstm.metadata.totalSamples / brstm.metadata.sampleRate;
				elTimeAmount.textContent = formatTime(amountTimeInS);
				elTime.max = amountTimeInS;

				if(muted){
					audioPlayer.setVolume(0);
				} else {
					audioPlayer.setVolume(elVolume.value / 100);
				}
				
				audioPlayer.setLoop(looped);
				startRenderCurrentTime();
			} catch (e) {
				console.error('e', e);
				elErrors.textContent = e.message;
			}
		
		});

	}

	function formatTime(timeAmountInS) {
		const mm = getTwoDigits(Math.floor(timeAmountInS / 60));
		const ss = getTwoDigits(Math.floor(timeAmountInS % 60));
		const xx = getTwoDigits(Math.floor(((timeAmountInS % 60) * 100) % 100));

		return `${mm}:${ss}.${xx}`;
	}
	
	function getTwoDigits(number) {
		if (number < 10) {
			return `0${number}`;
		}
		return number;
	}
	
	
	function renderCurrentTime() {
			
			
			
		if(mediaType == 1){
			const currentTime = audioPlayer.getCurrrentPlaybackTime();
			
			if (!isElTimeDragging) {
				elTime.value = currentTime;
			}
			elTimeCurrent.textContent = formatTime(currentTime);
			
			if (shouldCurrentTimeRender) {
				currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
			}
		} else if(mediaType == 2){
			
			const currentTime = videoPlayer.currentTime;
			
			if (!isElTimeDragging) {
				elTime.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
			}
			elTimeCurrent.textContent = formatTime(currentTime);
			
			if (shouldCurrentTimeRender) {
				currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
			}
		} else if(mediaType == 3){
			
			//TODO: Audio
			const currentTime = audioPlayer.currentTime;
			
			if (!isElTimeDragging) {
				elTime.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
			}
			elTimeCurrent.textContent = formatTime(currentTime);
			
			if (shouldCurrentTimeRender) {
				currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
			}
			
		} else if(mediaType == 4){
		
			const currentTime = videoPlayer.currentTime;
			
			if (!isElTimeDragging) {
				elTime.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
			}
			elTimeCurrent.textContent = formatTime(currentTime);
			
			if (shouldCurrentTimeRender) {
				currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
			}
		}

	}

	function startRenderCurrentTime() {
		shouldCurrentTimeRender = true;
		currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
	}
	
	function stopRenderCurrentTime() {
		if (currentTimeRenderAf) {
			cancelAnimationFrame(currentTimeRenderAf);
		}
		shouldCurrentTimeRender = false;
	}
	
	function disableStreamCheckboxes() {
		for (const child of elStreamSelect.childNodes) {
			child.disabled = true;
		}
	}
		
	function enableStreamCheckboxes() {
		for (const child of elStreamSelect.childNodes) {
			child.disabled = false;
		}
	}
	
	function streamCheckedHandler(i) {
		if (!audioPlayer) {
			return;
		}
		streamStates[i] = !streamStates[i];
		audioPlayer.setStreamStates(streamStates);
	}
});
