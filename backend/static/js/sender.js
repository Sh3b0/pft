const fileInput = document.getElementById('fileInput')
const sendButton = document.getElementById('sendButton')
const inviteButton = document.getElementById('inviteButton')
const progress = document.getElementById('progress')
const status = document.getElementById('status')

let localConnection, sendChannel, latestOffer, fileMeta

// TODO: resend ice candidates as they arrive
// TODO: handle erroneous situations

// Creating local connection
window.onload = () => {
    const conf = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]}
    localConnection = new RTCPeerConnection(conf)
    localConnection.onicecandidate = e => {
        console.log("New ice candidate")
        latestOffer = localConnection.localDescription
    }
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onmessage = e => console.log("Message from peer: " + e.data)
    sendChannel.onreadystatechange = e => {
        console.log(e.connectionState)
    }
    localConnection.createOffer().then(o => localConnection.setLocalDescription(o))
}

// Toggle send/invite button
fileInput.onchange = () => {
    console.log('File input changed')
    let size = fileInput.files[0].size
    if (size < 1e9) {
        inviteButton.disabled = !fileInput.files.length
    } else {
        inviteButton.disabled = true
        fileInput.value = ''
        alert("File is too large (limit: 1GB)")
    }
}

// SendButton functionality
sendButton.onclick = e => {
    console.log('Sending file: ' + e)
    sendButton.disabled = true

    const fileReader = new FileReader();
    const chunkSize = 16000
    const file = fileInput.files[0]
    let so_far = 0

    // Reads chunkSize bytes of the file, starting from byte o
    const readChunk = o => {
        // console.log("Reading chunk, starting from ", o);
        const slice = file.slice(o, o + chunkSize)
        fileReader.readAsArrayBuffer(slice)
    }
    readChunk(0)  // Start sending file

    fileReader.onerror = e => {
        console.error('Error reading file: ', e)
        closeConnection()
    }
    fileReader.onabort = e => {
        console.log('Aborting: ', e)
        closeConnection()
    }

    async function sendChunk() {
        await timeout(1)
        console.log("Sending chunk")
        sendChannel.send(fileReader.result)
        so_far += fileReader.result.byteLength
        progress.value = so_far / file.size * 100
        if (progress.value === 100) {
            status.textContent = "Upload Complete"
        }
        if (so_far < file.size) {
            readChunk(so_far)
        }
    }

    // On reading a part of the file, we send that part
    fileReader.onload = sendChunk
}


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
    // console.log('MSG = ' + JSON.stringify(Object.assign({}, latestOffer.toJSON(), fileMeta)))

    xhr.send(JSON.stringify(Object.assign({}, latestOffer.toJSON(), fileMeta)))
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {  // DONE
            // console.log("Response: " + xhr.response)
        }
    }
    let inviteLink = document.location.origin + '/receiver/' + roomId
    alert(inviteLink)
    get_answer()
}

// Gets SDP answer from API
function get_answer() {
    status.textContent = "Waiting for receiver to join"
    console.log("Getting answer...")
    let xhr = new XMLHttpRequest()
    let roomId = hashCode(JSON.stringify(fileMeta))
    let roomLink = document.location.origin + '/api/' + roomId
    xhr.open("GET", roomLink, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send()
    xhr.onreadystatechange = e => {
        if (e.target.readyState === 4) {  // DONE
            // console.log("Response: " + xhr.response)
            let rsp = JSON.parse(JSON.parse(xhr.response))
            if (rsp.type === "answer") {
                status.textContent = "Connecting"
                localConnection.setRemoteDescription(rsp)
                    .then(() => {
                        status.textContent = 'Connected'
                        sendButton.disabled = false
                        inviteButton.disabled = true
                        return 0
                    })
                    .catch(() => status.textContent = 'Connection Error')

            } else if (rsp.type === 'offer') {
                setTimeout(get_answer, 1000)
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


function closeConnection() {
    console.log('Closing Connection...')
    if (sendChannel) {
        sendChannel.close()
        sendChannel = null
    }
    if (localConnection) {
        localConnection.close()
        localConnection = null
    }
    fileInput.disabled = false
}

window.onbeforeunload = closeConnection