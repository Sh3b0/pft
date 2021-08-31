// Sender code

// Globals
const form = document.getElementById('form')
const fileInput = document.getElementById('fileInput')
const sendButton = document.getElementById('sendButton')
let localConnection, sendChannel


// Creating local connection
window.onload = e => {
    console.log('Document loaded: ', e)
    const conf = {}
    conf.iceServers = []
    conf.iceServers.push({
        urls: 'stun:stun1.l.google.com:19302'
    })

    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = e => {
        console.log("New ice candidate", e)
        const offer = localConnection.localDescription
        const offerTxt = document.getElementById('offer')
        offerTxt.innerHTML = JSON.stringify(offer)
    }

    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onmessage = e => console.log("Message from peer: " + e.data)
    sendChannel.onopen = () => console.log("Channel opened")
    sendChannel.onclose = () => console.log("Channel closed")

    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

// Toggle send button
fileInput.onchange = e => {
    console.log('File input changed')
    sendButton.disabled = !fileInput.files.length;
}

// Send button functionality
sendButton.onclick = e => {
    console.log('Sending file: ' + e)
    sendButton.disabled = true

    if(sendChannel.readyState !== 'open'){
        console.log('Data Channel is not ready')
        return
    }

    const file = fileInput.files[0]
    const fileReader = new FileReader();
    const chunkSize = 16384
    let so_far = 0

    fileReader.onerror = e => {
        console.error('Error reading file: ', e)
    }
    fileReader.onabort = e => {
        console.log('Aborting: ', e)
    }

    // On reading a part of the file, we send that part
    fileReader.onload = e => {
        sendChannel.send(e.target.result);
        so_far += e.target.result.byteLength;
        if (so_far < file.size) {
            readPart(so_far);
        }
    }

    // Reads chunkSize bytes of the file, starting from byte o
    const readPart = o => {
        console.log(`Reading chunk, starting from `, o);
        const slice = file.slice(o, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readPart(0);
}


// Temporary method of connection establishment
// TODO: create rooms system
form.onsubmit = e => {
    e.preventDefault()
    const answer = document.getElementById("answer").value
    localConnection.setRemoteDescription(JSON.parse(answer)).then(() => console.log("Connected to receiver"))
}
