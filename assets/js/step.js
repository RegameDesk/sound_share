function nextStep(step) {
	document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'))
	document.getElementById(`step${step}`).classList.remove('hidden')
}

function prevStep(step) {
	document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'))
	document.getElementById(`step${step}`).classList.remove('hidden')
}

function restart() {
	document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'))
	document.getElementById('step1').classList.remove('hidden')
}
