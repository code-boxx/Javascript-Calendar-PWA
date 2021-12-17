var cal = {
  // (A) GLOBAL SUPPORT FUNCTION - GENERATE HTML ERROR MESSAGE
  err : (msg) => {
    let row = document.createElement("div");
    row.innerHTML = msg;
    row.className = "err";
    document.body.prepend(row);
  },

  // (B) INIT PART 1 - REQUIREMENTS CHECK
  iniA : () => {
    // (B1) REQUIREMENTS INIT
    let pass = true;

    // (B2) REQUIREMENT - INDEXED DB
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) {
      cal.err("Your browser does not support indexed database.");
      pass = false;
    }

    // (B3) REQUIREMENT - SERVICE WORKER
    if (!"serviceWorker" in navigator) {
      cal.err("Your browser does not support service workers.");
      pass = false;
    }

    // (B4) REQUIREMENT - CACHE STORAGE
    if (!caches) {
      cal.err("Your browser does not support cache storage.");
      pass = false;
    }

    // (B5) NO GO
    if (!pass) { return; }

    // (B6) OK - INIT WORKER & IDB
    cal.iniB();
  },

  // (C) INIT PART 2 - SERVICE WORKER & IDB
  iDBN : "MyCalendar", iDB : null, iTX : null, // IDB OBJECT & TRANSACTION
  iniB : () => {
    // (C1) SERVICE WORKER
    navigator.serviceWorker.register("js-calendar-sw.js")
    .then((reg) => { cal.iniC(); })
    .catch((err) => {
      cal.err("Service worker init error - " + err.message);
      console.error(err);
    });

    // (C2) INDEXED DATABASE
    // (C2-1) OPEN "MYNOTES" DATABASE
    let req = window.indexedDB.open(cal.iDBN, 1);

    // (C2-2) ON DATABASE ERROR
    req.onerror = (evt) => {
      cal.err("Indexed DB init error - " + evt.message);
      console.error(evt);
    };

    // (C2-3) UPGRADE NEEDED
    req.onupgradeneeded = (evt) => {
      // INIT UPGRADE
      cal.iDB = evt.target.result;
      cal.iDB.onerror = (evt) => {
        cal.err("Indexed DB upgrade error - " + evt.message);
        console.error(evt);
      };

      // VERSION 1
      if (evt.oldVersion < 1) {
        let store = cal.iDB.createObjectStore(cal.iDBN, {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("start", "start", { unique: false });
        store.createIndex("end", "end", { unique: false });
      }
    };

    // (C2-4) OPEN DATABASE OK - REGISTER IDB OBJECTS
    req.onsuccess = (evt) => {
      cal.iDB = evt.target.result;
      cal.iTX = () => {
        return cal.iDB
        .transaction(cal.iDBN, "readwrite")
        .objectStore(cal.iDBN);
      };
      cal.iniC();
    };
  },

  // (D) INIT PART 3 - HTML INTERFACE
  // * PROCEED ONLY IF SERVICE WORKER + IDB OK
  mName : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ready : 0, // number of ready components
  iniC : () => { cal.ready++; if (cal.ready==2) {
    // (D1) DATE NOW
    let now = new Date(),
        nowMth = now.getMonth(),
        nowYear = parseInt(now.getFullYear());

    // (D2) APPEND MONTHS SELECTOR
    let el = document.getElementById("cMth");
    for (let i=0; i<12; i++) {
      let opt = document.createElement("option");
      opt.value = i;
      opt.innerHTML = cal.mName[i];
      if (i==nowMth) { opt.selected = true; }
      el.appendChild(opt);
    }
    el.onchange = () => { cal.load(true); };

    // (D3) APPEND YEARS SELECTOR
    // Set to 10 years range. Change this as you like.
    el = document.getElementById("cYear");
    for (let i=nowYear-10; i<=nowYear+10; i++) {
      let opt = document.createElement("option");
      opt.value = i;
      opt.innerHTML = i;
      if (i==nowYear) { opt.selected = true; }
      el.appendChild(opt);
    }
    el.onchange = () => { cal.load(true); };

    // (D4) OTHER BUTTONS & FORMS
    document.getElementById("cAdd").onclick = () => { cal.addEdit() };
    document.getElementById("cDel").onclick = cal.del;
    document.getElementById("cBack").onclick = () => { cal.toggle("C"); };
    document.getElementById("cForm").onsubmit = cal.save;

    // (D5) INIT DRAW CALENDAR
    cal.load(true);
  }},

  // (E) LOAD CALENDAR EVENTS FOR THE CURRENT MONTH/YEAR
  sMth : null, // currently selected month
  sYear : null, // currently selected year
  sFirst : null, // first day (yyyymmdd) of selected month/year
  sLast : null, // last day (yyyymmdd) of selected month/year
  sDays : null, // number of days in selected month/year
  data : null, // events data for selected month/year
  load : (init) => {
    // (E1) LOAD DATA FROM IDB
    if (init) {
      // (E1-1) GET SELECTED MONTH YEAR
      // Note - Jan is 0 & Dec is 11
      cal.sMth = document.getElementById("cMth").value;
      cal.sYear = document.getElementById("cYear").value;
      let sMth = +cal.sMth + 1;
      cal.sDays = new Date(cal.sYear, sMth, 0).getDate();

      // (E1-2) START & END OF MONTH
      if (sMth < 10) { sMth = "0" + sMth; }
      cal.sFirst = parseInt(cal.sYear + sMth + "01");
      cal.sLast = parseInt(cal.sYear + sMth + cal.sDays);

      // (E1-3) FETCH INIT
      // INEFFICIENT. BUT NO OTHER WAYS TO DO COMPLEX SEARCH IN IDB.
      cal.ready = 0;
      cal.data = {};
      document.getElementById("cWrap").innerHTML = "";
      let rangeA = IDBKeyRange.bound(cal.sFirst, cal.sLast),
          rangeB = IDBKeyRange.lowerBound(cal.sLast, true);

      // (E1-4) GET ALL START DATE THAT FALLS INSIDE MONTH/YEAR
      cal.iTX().index("start").openCursor(rangeA).onsuccess = (evt) => {
        let cursor = evt.target.result;
        if (cursor) {
          if (!cal.data[cursor.value.id]) {
            cal.data[cursor.value.id] = cursor.value;
          }
          cursor.continue();
        } else { cal.load(false); }
      };

      // (E1-5) GET ALL END DATE THAT FALLS INSIDE MONTH/YEAR
      cal.iTX().index("end").openCursor(rangeA).onsuccess = (evt) => {
        let cursor = evt.target.result;
        if (cursor) {
          if (!cal.data[cursor.value.id]) {
            cal.data[cursor.value.id] = cursor.value;
          }
          cursor.continue();
        } else { cal.load(false); }
      };

      // (E1-6) END DATE AFTER SELECTED MONTH/YEAR, BUT START IS BEFORE
      cal.iTX().index("end").openCursor(rangeB).onsuccess = (evt) => {
        let cursor = evt.target.result;
        if (cursor) {
          if (cursor.value.start<cal.sFirst && !cal.data[cursor.value.id]) {
            cal.data[cursor.value.id] = cursor.value;
          }
          cursor.continue();
        } else { cal.load(false); }
      };
    }

    // (E2) WAIT FOR DATA FETCH COMPLETION
    else {
      cal.ready++;
      if (cal.ready==3) {
        cal.toggle("C");
        cal.draw();
      }
    }
  },

  // (F) DRAW CALENDAR
  draw : () => {
    // (F1) PRE-CALCULATIONS
    // Note - Jan is 0 & Dec is 11
    // Note - Sun is 0 & Sat is 6
    let sMon = false, // week start on monday?
        sDay = new Date(cal.sYear, cal.sMth, 1).getDay(), // first day of the month
        eDay = new Date(cal.sYear, cal.sMth, cal.sDays).getDay(), // last day of the month
        now = new Date(), // current date
        nowMth = now.getMonth(), // current month
        nowYear = parseInt(now.getFullYear()), // current year
        nowDay = cal.sMth==nowMth && cal.sYear==nowYear ? now.getDate() : null ;

    // (F2) DRAWING CALCULATIONS
    // Blank squares before start of month
    let squares = [];
    if (sMon && sDay != 1) {
      let blanks = sDay==0 ? 7 : sDay ;
      for (let i=1; i<blanks; i++) { squares.push("b"); }
    }
    if (!sMon && sDay != 0) {
      for (let i=0; i<sDay; i++) { squares.push("b"); }
    }

    // Days of the month
    for (let i=1; i<=cal.sDays; i++) { squares.push(i); }

    // Blank squares after end of month
    if (sMon && eDay != 0) {
      let blanks = eDay==6 ? 1 : 7-eDay;
      for (let i=0; i<blanks; i++) { squares.push("b"); }
    }
    if (!sMon && eDay != 6) {
      let blanks = eDay==0 ? 6 : 6-eDay;
      for (let i=0; i<blanks; i++) { squares.push("b"); }
    }

    // (F3) DRAW HTML CALENDAR
    // Get container
    let container = document.getElementById("cWrap"),
        cTable = document.createElement("table");
    cTable.id = "calendar";
    container.innerHTML = "";
    container.appendChild(cTable);

    // First row - Day names
    let cRow = document.createElement("tr"),
        days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
    if (sMon) { days.push(days.shift()); }
    for (let d of days) {
      let cCell = document.createElement("td");
      cCell.innerHTML = d;
      cRow.appendChild(cCell);
    }
    cRow.classList.add("head");
    cTable.appendChild(cRow);

    // Days in Month
    let total = squares.length;
    cRow = document.createElement("tr");
    cRow.classList.add("day");
    for (let i=0; i<total; i++) {
      let cCell = document.createElement("td");
      cCell.id = "cCell-" + squares[i];
      if (squares[i]=="b") { cCell.classList.add("blank"); }
      else {
        if (nowDay==squares[i]) { cCell.classList.add("today"); }
        cCell.innerHTML = `<div class="dd">${squares[i]}</div>`;
      }
      cRow.appendChild(cCell);
      if (i!=0 && (i+1)%7==0) {
        cTable.appendChild(cRow);
        cRow = document.createElement("tr");
        cRow.classList.add("day");
      }
    }

    // (F4) DRAW EVENTS
    if (Object.keys(cal.data).length > 0) { for ([id, e] of Object.entries(cal.data)) {
      if (e.start < cal.sFirst) { e.start = cal.sFirst; }
      if (e.end > cal.sLast) { e.end = cal.sLast; }
      let eStart = +e.start.toString().substr(-2),
          eEnd = +e.end.toString().substr(-2);

      for (let i=eStart; i<=eEnd; i++) {
        let eRow = document.createElement("div"),
            eid = id;
        eRow.innerHTML = e.evt;
        eRow.className = "evt";
        eRow.style.background = e.color;
        eRow.onclick = () => { cal.addEdit(eid); };
        document.getElementById("cCell-" + i).appendChild(eRow);
      }
    }}
  },

  // (G) TOGGLE BETWEEN "C"ALENDAR & "E"VENT FORM
  mode : "C", // CURRENT "MODE"
  toggle : (mode) => {
    for (let e of document.getElementsByClassName("page"+(mode=="C"?"E":"C"))) {
      e.classList.add("ninja");
    }
    for (let e of document.getElementsByClassName("page"+mode)) {
      e.classList.remove("ninja");
    }
    if (mode=="E") {
      document.getElementById("cHeadE").innerHTML = cal.id ? "Edit Event" : "Add Event";
      if (!cal.id) { document.getElementById("cDel").classList.add("ninja"); }
    } else { cal.id = null; }
    cal.mode = mode;
  },

  // (H) SHOW ADD/EDIT NOTE FORM
  id : null, // CURRENT EVENT ID
  addEdit : (id) => {
    // (H1) SET SELECTED ID - NULL OR UNDEFINED FOR ADD NEW
    cal.id = id!==undefined ? parseInt(id) : null;

    // (H2) IF EDIT - GET NOTE ENTRY
    if (cal.id) {
      let req = cal.iTX().get(cal.id);
      req.onsuccess = () => {
        let e = req.result,
            eStart = e.start.toString(),
            eEnd = e.end.toString();
        eStart = [eStart.substr(0,4), eStart.substr(4,2), eStart.substr(6,2)].join("-");
        eEnd = [eEnd.substr(0,4), eEnd.substr(4,2), eEnd.substr(6,2)].join("-");
        document.getElementById("ceStart").value = eStart;
        document.getElementById("ceEnd").value = eEnd;
        document.getElementById("ceTxt").value = e.evt;
        document.getElementById("ceColor").value = e.color;
        cal.toggle("E");
      };
    }

    // (H3) NEW ENTRY
    else {
      document.getElementById("ceStart").value = "";
      document.getElementById("ceEnd").value = "";
      document.getElementById("ceTxt").value = "";
      document.getElementById("ceColor").value = "#e0eeff";
      cal.toggle("E");
    }
  },

  // (I) SAVE EVENT
  save : () => {
    // (I1) DATE CHECK
    let eStart = document.getElementById("ceStart").value,
        eEnd = document.getElementById("ceEnd").value;
    if (new Date(eStart) > new Date(eEnd)) {
      alert("Start date cannot be later than end date");
      return false;
    }

    // (I2) DATA TO SAVE
    let data = {
      start : +eStart.replaceAll("-", ""),
      end : +eEnd.replaceAll("-", ""),
      evt : document.getElementById("ceTxt").value,
      color : document.getElementById("ceColor").value
    };

    // (I3) EDIT ENTRY
    if (cal.id) {
      data.id = cal.id;
      cal.iTX().put(data);
    }

    // (I4) NEW ENTRY
    else { cal.iTX().add(data); }

    // (I5) DONE!
    cal.load(true);
    return false;
  },

  // (J) DELETE EVENT
  del : () => { if (confirm("Delete Event?")) {
    cal.iTX().delete(cal.id);
    cal.load(true);
  }}
};
window.addEventListener("load", cal.iniA);
