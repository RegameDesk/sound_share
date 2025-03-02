document.querySelectorAll('.tab-button').forEach(button => {
	button.addEventListener('click', function() {
		document.querySelectorAll('.tab-button').forEach(btn => {
			btn.classList.remove('active')
		})

		document.querySelectorAll('.tab-content').forEach(content => {
			content.classList.remove('active')
		})

		this.classList.add('active')
		const targetId = this.dataset.target
		document.getElementById(targetId).classList.add('active')
	})
})

document.addEventListener('keydown', (e) => {
	const tabs = document.querySelectorAll('.tab-button')
	const currentIndex = Array.from(tabs).findIndex(t => t.classList.contains('active'))

	if(e.key === 'ArrowRight') {
    const nextIndex = (currentIndex + 1) % tabs.length
    tabs[nextIndex].click()
	}

	if(e.key === 'ArrowLeft') {
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
    tabs[prevIndex].click()
	}
})