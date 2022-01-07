var cb = {
  // (A) REGISTER PAGES HERE
  pages : {
    home : {file:"home.inc", load:cal.prepare},
    form : {file:"form.inc", load:cal.get}
  },

  // (B) LOAD PAGE
  load : () => {
    // (B1) PAGE TO LOAD
    let page = location.hash=="" ? "home" : location.hash.substr(1);

    // (B2) UNDEFINED PAGE
    if (cb.pages[page]==undefined) {
      alert(`ERROR - ${page} is not defined!`);
    }

    // (B3) AJAX FETCH
    else {
      fetch(cb.pages[page].file)
      .then((res) => { if (res.status!=200) {
        alert(`ERROR - server returned ${res.status}`)
        return "";
      } else { return res.text(); }})
      .then((txt) => {
        document.getElementById("cb-main").innerHTML = txt;
        if (cb.pages[page].load) { cb.pages[page].load(); }
      })
      .catch((err) => { console.error(err); });
    }
  },

  // (C) SHOW INFO BOX
  //  msg : message to show
  //  nogood : shows "warning" icon if true
  infotimer : null,
  info : (msg, nogood) => {
    // (C1) SET MESSAGE + ICON
    document.getElementById("cb-info-ico").innerHTML = nogood ? "warning" : "check";
    document.getElementById("cb-info-txt").innerHTML = msg;

    // (C2) SET VISIBLE
    let infobox = document.getElementById("cb-info");
    if (nogood) {
      infobox.classList.remove("ok");
      infobox.classList.add("no");
    } else {
      infobox.classList.remove("no");
      infobox.classList.add("ok");
    }

    // (C3) RESET TIMER
    clearTimeout(cb.infotimer);
    cb.infotimer = setTimeout(cb.infoff, 2000);
  },

  // (D) CLOSE INFO BOX
  infoff : () => {
    let infobox = document.getElementById("cb-info");
    infobox.classList.remove("ok");
    infobox.classList.remove("no");
  }
};

// (E) LISTEN TO HASH CHANGE
window.addEventListener("hashchange", cb.load);
