const { ipcRenderer } = require('electron');
const mm = require('music-metadata');

const albumList = document.getElementById('album-list');
const songList = document.getElementById('song-list');
const selectDirButton = document.getElementById('select-dir');
let musicDir = localStorage.getItem('musicDir');

let currentSongIndex = -1; // Track the current song index
let currentSongs = []; // Store the songs for the current album
let currentSongsSorted = []; // Store the songs for the current album
let random = false; // Allow random playback or not
let inactive = 10;

setInterval(() => {
  if(inactive==0){
    document.getElementById('idle').classList.add('gone');
    document.getElementById('container').classList.add('blur');
  }else{
    inactive--;
    document.getElementById('idle').classList.remove('gone');
    document.getElementById('container').classList.remove('blur');

  }
}, 1000);


document.addEventListener('mousemove', () => {
  inactive = 10; // reset inactive timer
});

document.getElementById('random').addEventListener('click', e  => {
  random = !random;
  document.getElementById('random').textContent = random ? '📄' : '🎱';
});
document.getElementById('search-input').addEventListener('input',() => handleSearch());

if (musicDir) {
  loadMusic(musicDir);
} else {
  selectDirectory();
}

selectDirButton.addEventListener('click', selectDirectory);

async function selectDirectory() {
  const dir = await ipcRenderer.invoke('select-directory');
  if (dir) {
    localStorage.setItem('musicDir', dir);
    loadMusic(dir);
  }
}

async function loadMusic(dir) {
  const albums = await ipcRenderer.invoke('load-music', dir);
  displayAlbums(albums);
}

function displayAlbums(albums) {
  albumList.innerHTML = '';
  for (const album in albums) {
    const li = document.createElement('li');
    li.textContent = album;
    li.onclick = () => displaySongs(albums[album]);
    albumList.appendChild(li);
  }
}

async function displaySongs(songs,searchTerm) {
  songList.innerHTML = '';
  currentSongs = songs;
  currentSongIndex = -1; // Reset current index

  // Filter songs based on the search term
  const filteredSongs = songs.filter(song => {
    if(searchTerm === undefined || searchTerm === '') return true;
    const title = song.split('/').pop(); // Fallback to filename
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });
  currentSongsSorted = filteredSongs; // Store songs for the current album
  for (const [index, song] of filteredSongs.entries()) {
    try {
      const metadata = await mm.parseFile(song);
      const li = document.createElement('li');
      
      // Create a container for song info and cover
      const songInfo = document.createElement('div');
      songInfo.classList.add('song-info');

      // Display song title and artist
      const title = document.createElement('span');
      const artist = document.createElement('span');
      title.textContent = `${metadata.common.title || 'Unknown Title'}`;
      // artist.textContent = `${metadata.common.artist || 'Unknown Artist'}`;
      songInfo.appendChild(title);
      songInfo.appendChild(artist);
      
      // Display cover art if available
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const cover = document.createElement('img');
        cover.src = `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}`;
        cover.alt = 'Cover Art';
        cover.classList.add('cover-art');
        songInfo.appendChild(cover);
      }

      // Click event to play the song
      li.onclick = () => playSong(index);
      li.appendChild(songInfo);
      songList.appendChild(li);
    } catch (error) {
      console.error(`Error reading metadata for ${song}:`, error);
      const li = document.createElement('li');

      // Click event to play the song
      li.onclick = () => playSong(index);
      li.textContent = song.split('/').pop(); // Display filename if metadata read fails
      songList.appendChild(li);
    }
  }
}

async function playSong(index) {
  if (currentSongs.length === 0) return;

  currentSongIndex = index; // Update current song index
  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.src = currentSongsSorted[currentSongIndex]; // Set the source to the selected song
  audioPlayer.play();

  //Also set the div img to song played
  const metadata = await mm.parseFile(currentSongsSorted[currentSongIndex]);
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    // Display cover art if available
    const idle = document.createElement('img');
    idle.src = `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}`;
    document.getElementById('idle').innerHTML = '';
    document.getElementById('idle').appendChild(idle);
    //Show on control bar aswell
    const cover = document.createElement('img');
    cover.src = `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}`;
    cover.alt = 'Cover Art';
    cover.classList.add('cover-art');
    document.getElementById('cover').innerHTML = '';
    document.getElementById('cover').appendChild(cover);
  }

  // Add an event listener to play the next song when the current song ends
  audioPlayer.onended = () => {
    if (random) {
      // Get a random index for the next song
      currentSongIndex = Math.floor(Math.random() * currentSongsSorted.length);
    } else {
      currentSongIndex++;
      if (currentSongIndex >= currentSongsSorted.length) {
        currentSongIndex = 0; // Loop back to the start
      }
    }
    playSong(currentSongIndex); // Play the next song
  };
}

function handleSearch() {
  const searchTerm = document.getElementById('search-input').value;
  displaySongs(currentSongs, searchTerm); // Call displaySongs with the search term
}