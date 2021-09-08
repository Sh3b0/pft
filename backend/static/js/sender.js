// Globals

const fileInput = document.getElementById('fileInput')
const sendButton = document.getElementById('sendButton')
const inviteButton = document.getElementById('inviteButton')
const progress = document.getElementById('progress')

let localConnection, sendChannel, latestOffer, fileMeta

// TODO: resend ice candidates as they arrive
// TODO: make calculations for progress bar
// TODO: make checks for filesize limit
// TODO: delete rooms from server
// TODO: close channel after transfer ends and display some message
// TODO: handle erroneous situations

// Creating local connection
window.onload = () => {
    console.log("Window loaded")
    const conf = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]}
    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = () => {
        console.log("New ice candidate")
        latestOffer = localConnection.localDescription
        // offerP.innerHTML = JSON.stringify(latestOffer)
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onmessage = e => console.log("Message from peer: " + e.data)
    sendChannel.onopen = () => console.log("Connection opened")
    sendChannel.onclose = () => console.log("Connection closed")
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

// Toggle send/invite button
fileInput.onchange = () => {
    console.log('File input changed')
    inviteButton.disabled = !fileInput.files.length
}

// SendButton functionality
sendButton.onclick = e => {
    console.log('Sending file: ' + e)
    sendButton.disabled = true

    if (sendChannel.readyState !== 'open') {
        console.log('Data Channel is not ready')
        return
    }

    const file = fileInput.files[0]
    const fileReader = new FileReader();
    const chunkSize = 16384
    let so_far = 0

    fileReader.onerror = e => {
        console.error('Error reading file: ', e)
        // TODO: closeChannel()
    }
    fileReader.onabort = e => {
        console.log('Aborting: ', e)
        // TODO: closeChannel()
    }

    // Reads chunkSize bytes of the file, starting from byte o
    const readPart = o => {
        console.log("Reading chunk, starting from ", o);
        const slice = file.slice(o, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    }
    readPart(0);

    // On reading a part of the file, we send that part
    fileReader.onload = e => {
        sendChannel.send(e.target.result)
        so_far += e.target.result.byteLength
        progress.value = so_far / file.size * 100
        // progress.textContent = (so_far / file.size * 100).toString()
        if (so_far < file.size) {
            readPart(so_far)
        }
    }
}

// Gets hash code from a string
function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
}

// Puts SDP offer to API
function put_offer() {
    console.log("Putting offer...")
    let xhr = new XMLHttpRequest()
    let roomId = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("PUT", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    console.log('MSG = ' + JSON.stringify(Object.assign({}, latestOffer.toJSON(), fileMeta)))

    xhr.send(JSON.stringify(Object.assign({}, latestOffer.toJSON(), fileMeta)))
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {  // DONE
            console.log("Response: " + xhr.response)
        }
    }
    let inviteLink = document.location.origin + '/receiver/' + roomId
    alert(inviteLink)
    get_answer()
}

// Gets SDP answer from API
function get_answer() {
    console.log("Getting answer...")
    let xhr = new XMLHttpRequest()
    let roomId = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {  // DONE
            console.log("Response: " + xhr.response)
            let rsp = JSON.parse(JSON.parse(xhr.response))
            if (rsp.type === "answer") {
                console.log("Answer arrived")
                localConnection.setRemoteDescription(rsp).then(() => console.log("Connected to receiver"))
                sendButton.disabled = false
            } else if (rsp.type === 'offer') {
                get_answer()
            }
        }
    }
}


// InviteButton functionality
inviteButton.onclick = () => {
    fileMeta = {
        name: fileInput.files[0].name,
        size: fileInput.files[0].size,
        last_modified: fileInput.files[0].lastModified,
    }
    put_offer()
}
