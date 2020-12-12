const remote = require('electron').remote;
var fs = require('fs');
import { Brstm } from './lib/nikku/brstm/index.js';
import { AudioPlayer } from './lib/nikku/audioPlayer.js';

let audioPlayer = null;
const elTime = document.getElementById('controls-time');
const elPlayPause = document.getElementById('controls-play-pause');
const elLoop = document.getElementById('controls-loop');
const elVolume = document.getElementById('controls-volume');
const elTimeCurrent = document.getElementById('controls-time-current');
const elTimeAmount = document.getElementById('controls-time-amount');
const elStreamSelect = document.getElementById('controls-stream-select');
const elErrors = document.getElementById('errors');
const main = document.getElementById('main');
const menu = document.getElementById('controls-menu');

let currentTimeRenderAf = null;
let shouldCurrentTimeRender = false;
let isElTimeDragging = false;
let streamStates = [true];
let looped = false;
let volume = 1;
let hidemenu_timer = 3;
let mediaType = 0; // 0 = nothing playing, 1 = brstm, 2 = video;


window.addEventListener('DOMContentLoaded', () => {


	// Timers
	setInterval(hidemenu, 1000);



	//Menu Events
	document.ondragover = document.ondrop = (ev) => {
		ev.preventDefault()
	}

	document.body.ondrop = (ev) => {
		Play_File(ev.dataTransfer.files[0].path)
		ev.preventDefault()
	}
	
	window.addEventListener('mousemove', e => {
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
	});
	

	window.addEventListener('wheel', e => {
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
		
		if(Math.sign(e.deltaY) == -1) elVolume.value = parseInt(elVolume.value) + 5;
		if(Math.sign(e.deltaY) == 1) elVolume.value = parseInt(elVolume.value) - 5;
		console.log(elVolume.value);
	
		if(mediaType == 1){
			audioPlayer.setVolume(elVolume.value / 100);
			
		} else if(mediaType == 2){
			video.volume = elVolume.value / 100;
		}
	});
	
	
	
	elVolume.addEventListener('input', (e) => {
		e.preventDefault();
		e.stopPropagation();
			
		if(mediaType == 1){
			audioPlayer.setVolume(elVolume.value / 100);
			
		} else if(mediaType == 2){
			video.volume = elVolume.value / 100;
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
			if (video.paused) {
				elPlayPause.src = "../../assets/png/pause.png";
				video.play();
			} else {
				elPlayPause.src = "../../assets/png/play.png";
				video.pause();
			}
		}
	});
	
	
	
	
	
	
	
	
	
	window.addEventListener('keypress', e => {
		
		hidemenu_timer = 3;
		menu.style.display = "block";
		menu.style.cursor = "default";
		
		console.log(e.keyCode);
		if(e.keyCode == 32){
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
				if (video.paused) {
					elPlayPause.src = "../../assets/png/pause.png";
					video.play();
				} else {
					elPlayPause.src = "../../assets/png/play.png";
					video.pause();
				}
			}
		}
		
	});
	
	function hidemenu() {
		
		if(hidemenu_timer == 0){
			menu.style.display = "none";
			menu.style.cursor = "none !important";
		} else {
			hidemenu_timer--;
		}
	}
	
	
	
	if (remote.process.argv.length >= 2) {
		if(remote.process.argv[1] != "."){
			
			Play_File(remote.process.argv[1]);
			
			
		} else {
			Reset_Screen();
		}
	}

	function Play_File(path){
		
		var file_name = path.split('\\').pop().split('/').pop();
		var file_ext = file_name.split('.').pop().toLowerCase();

		
		switch(file_ext){
			case "brstm":
				mediaType = 1;
				Play_BRSTM(path, file_name);
				break;
			case "mp4":
			case "avi":
			case "mkv":
			case "mov":
			case "webm":
				mediaType = 2;
				Play_Video(path, file_name);
				break;
			case "mp3":
			case "wav":
			case "ogg":
				alert("The only audio engine finished are for BRSTM files");
				break;
		}
	}



	async function Play_Video(path_full, file_name){
		
		if (audioPlayer) {
			audioPlayer.destroy();
		}
		
		main.innerHTML = "<video id=\"video\"><source src=\"" + path_full + "\" type=\"video/mp4\"></video>";
		const video = document.getElementById('video');
		video.play();
		elPlayPause.src = "../../assets/png/pause.png";
		let time = video.duration * 10;
		console.log(time);
		elTimeAmount.textContent = formatTime(time);
		
		video.volume = 1;
		video.muted = false;
		
		elVolume.addEventListener('input', (e) => {
			e.preventDefault();
			e.stopPropagation();

			video.volume = e.target.value;
		});
		
		elLoop.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			if(looped){
				looped = false;
				elLoop.src = "../../assets/png/loop_off.png";
			
			} else {
				looped = true;
				elLoop.src = "../../assets/png/loop_on.png";
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
			let targetTimeInS =  video.duration * e.target.value / 100;
			console.log(targetTimeInS);
			isElTimeDraggingTimeoutId = setTimeout(() => {
				isElTimeDragging = false;
				video.currentTime = targetTimeInS;
				video.play();
			}, 150);
		});
		
		video.addEventListener('timeupdate', (e) => {
			renderCurrentTime()
		});
		
		
		video.addEventListener('click', (e) => {
			if (video.paused) {
				elPlayPause.src = "../../assets/png/pause.png";
				video.play();
			} else {
				elPlayPause.src = "../../assets/png/play.png";
				video.pause();

			}
		});
		
		function renderCurrentTime() {
			const currentTime = video.currentTime;
			if (!isElTimeDragging) {
				elTime.value = (video.currentTime / video.duration) * 100;
			}
			elTimeCurrent.textContent = formatTime(currentTime);

			//if (shouldCurrentTimeRender) {
				//currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
			//}
		}
		
		video.addEventListener('ended', (e) => {
			if(looped){
				e.target.currentTime = 0;
				e.target.play();
			} else {
				elPlayPause.src = "../../assets/png/replay.png";
			}
		});
	}
	
	
	function Reset_Screen(){
		main.innerHTML = "<img id=\"screen_logo\" src=\"../../assets/png/logo.png\"> ";
	}
	
	
	
	//Play_BRSTM("D:/Documents/GitHub/UI-Player/aa.brstm", "aa.brstm");
	async function Play_BRSTM(path_full, file_name){
		Reset_Screen();
		document.title = "UI-Player - Playing music - " + file_name;
		
		fs.readFile(path_full, async (err, data) => {
			try {
				elErrors.textContent = '';

				const brstm = new Brstm(data);

				if (audioPlayer) {
					audioPlayer.destroy();
				}

				audioPlayer = new AudioPlayer(brstm.metadata, {
					onPlay: () => {
						elPlayPause.src = "../../assets/png/pause.png";
					},
					onPause: () => {
						elPlayPause.src = "../../assets/png/play.png";
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

				audioPlayer.setVolume(elVolume.value / 100);
				audioPlayer.setLoop(looped);
				startRenderCurrentTime();
			} catch (e) {
				console.error('e', e);
				elErrors.textContent = e.message;
			}
		
		});
	
		function renderCurrentTime() {
			const currentTime = audioPlayer.getCurrrentPlaybackTime();
			if (!isElTimeDragging) {
				elTime.value = currentTime;
			}
			elTimeCurrent.textContent = formatTime(currentTime);

			if (shouldCurrentTimeRender) {
				currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
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

		function streamCheckedHandler(i) {
			if (!audioPlayer) {
				return;
			}
			streamStates[i] = !streamStates[i];
			audioPlayer.setStreamStates(streamStates);
		}


		elLoop.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!audioPlayer) {
				return;
			}
			
			if(looped){
				looped = false;
				elLoop.src = "../../assets/png/loop_off.png";
			
			} else {
				looped = true;
				elLoop.src = "../../assets/png/loop_on.png";
			}
		
			audioPlayer.setLoop(looped);
		});

		let isElTimeDraggingTimeoutId = null;
		elTime.addEventListener('input', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!audioPlayer) {
				return;
			}
			
			isElTimeDragging = true;
			if (isElTimeDraggingTimeoutId) {
				clearTimeout(isElTimeDraggingTimeoutId);
			}
			
			// Make sure targetTimeInMs is at most "xx.xx" (chop off the 0.00000000000001 floating point error)
			let targetTimeInS = Math.round(parseFloat(e.target.value) * 1000 + 150) / 1000;
			isElTimeDraggingTimeoutId = setTimeout(() => {
				isElTimeDragging = false;
				audioPlayer.seek(targetTimeInS);
				startRenderCurrentTime();
			}, 150);
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
		const currentTime = audioPlayer.getCurrrentPlaybackTime();
		if (!isElTimeDragging) {
			elTime.value = currentTime;
		}
		elTimeCurrent.textContent = formatTime(currentTime);

		if (shouldCurrentTimeRender) {
			currentTimeRenderAf = requestAnimationFrame(renderCurrentTime);
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
});
