const tabLinks = document.querySelectorAll('.tab-link')
const tabContents = document.querySelectorAll('.tab-content')

tabLinks.forEach(link => {
  link.addEventListener('click', () => {
    tabLinks.forEach(link => link.classList.remove('active'))
    tabContents.forEach(content => content.classList.remove('active'))

    link.classList.add('active')
    const tabId = link.getAttribute('data-tab')
    document.getElementById(tabId).classList.add('active')
  })
})
