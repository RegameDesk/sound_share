function mui(muiLangs, prefix) {
  if (!Array.isArray(muiLangs) || muiLangs.length < 2) return
  
  const nativeLang = muiLangs[0]
  let selectedLang = nativeLang
  for (const lang of navigator.languages) {
    if (lang.includes('-')) {
      if (muiLangs.includes(lang)) {
        selectedLang = lang
        break
      }
    } else {
      for (const mui of muiLangs) {
        if (mui.split('-')[0] === lang) {
          userLang = mui
          break
        }
      }
    }
  }
  
  if (nativeLang === selectedLang) return
  setLanguage(prefix + selectedLang + '.json')
}

async function loadLanguage(langFile) {
  const response = await fetch(langFile);
  return await response.json();
}

async function setLanguage(langFile) {
  console.log(langFile)

  const translations = await loadLanguage(langFile);
  for (const arr of Object.entries(translations)) {
    if (typeof (arr[0]) !== 'string' || typeof (arr[1]) !== 'string') continue

    const ele = document.getElementById(arr[0])
    if (ele === null) continue
    ele.innerHTML = arr[1]
  }
}
