var cal = {
  // (A) INIT APP
  iDB : null, iTX : null, iName : "MyCalendar", // idb object & transaction
  init : () => {
    // (A1) HTML + FLAGS STUFF
    let pass = true,
        page = document.getElementById("cb-main"),
        err = (msg) => {
          let row = document.createElement("div");
          row.className = "error";
          row.innerHTML = msg;
          page.appendChild(row);
        };

    // (A2) REQUIREMENT - INDEXED DB
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) {
      err("Your browser does not support indexed database.");
      pass = false;
    }

    // (A3) REQUIREMENT - SERVICE WORKER
    if (!"serviceWorker" in navigator) {
      err("Your browser does not support service workers.");
      pass = false;
    }

    // (A4) REQUIREMENT - CACHE STORAGE
    if (!caches) {
      err("Your browser does not support cache storage.");
      pass = false;
    }

    // (A5) SERVICE WORKER
    navigator.serviceWorker.register("js-calendar-sw.js")
    .then((reg) => { cal.start(); })
    .catch((err) => {
      err("Service worker init error - " + err.message);
      console.error(err);
    });

    // (A6) INDEXED DATABASE
    // (A6-1) OPEN "MYCALENDAR" DATABASE
    let req = window.indexedDB.open(cal.iName, 1);

    // (A6-2) ON DATABASE ERROR
    req.onerror = (evt) => {
      err("Indexed DB init error - " + evt.message);
      console.error(evt);
    };

    // (A6-3) UPGRADE NEEDED
    req.onupgradeneeded = (evt) => {
      // INIT UPGRADE
      cal.iDB = evt.target.result;
      cal.iDB.onerror = (evt) => {
        err("Indexed DB upgrade error - " + evt.message);
        console.error(evt);
      };

      // VERSION 1
      if (evt.oldVersion < 1) {
        let store = cal.iDB.createObjectStore(cal.iName, {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("start", "start", { unique: false });
        store.createIndex("end", "end", { unique: false });
      }
    };

    // (A6-4) OPEN DATABASE OK - REGISTER IDB OBJECTS
    req.onsuccess = (evt) => {
      cal.iDB = evt.target.result;
      cal.iTX = () => {
        return cal.iDB
        .transaction(cal.iName, "readwrite")
        .objectStore(cal.iName);
      };
      cal.start();
    };
  },

  // (B) START APP
  ready : 0, // number of ready components
  start : () => {
    cal.ready++;
    if (cal.ready==2) { cb.load(); }
  },

  // (C) PREPARE CALENDAR INTERFACE
  mName : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  prepare : () => {
    // (C1) DATE NOW
    let now = new Date(),
        nowMth = now.getMonth(),
        nowYear = parseInt(now.getFullYear());

    // (C2) APPEND MONTHS SELECTOR
    let el = document.getElementById("cal-mth");
    for (let i=0; i<12; i++) {
      let opt = document.createElement("option");
      opt.value = i;
      opt.innerHTML = cal.mName[i];
      if (i==nowMth) { opt.selected = true; }
      el.appendChild(opt);
    }
    el.onchange = () => { cal.load(true); };

    // (C3) APPEND YEARS SELECTOR
    // set to 10 years range. change this as you like.
    el = document.getElementById("cal-year");
    for (let i=nowYear-10; i<=nowYear+10; i++) {
      let opt = document.createElement("option");
      opt.value = i;
      opt.innerHTML = i;
      if (i==nowYear) { opt.selected = true; }
      el.appendChild(opt);
    }
    el.onchange = () => { cal.load(true); };

    // (C4) INIT DRAW CALENDAR
    cal.load(true);
  },

  // (D) LOAD CALENDAR EVENTS FOR THE CURRENT MONTH/YEAR
  sMth : null, // currently selected month
  sYear : null, // currently selected year
  sFirst : null, // first day (yyyymmdd) of selected month/year
  sLast : null, // last day (yyyymmdd) of selected month/year
  sDays : null, // number of days in selected month/year
  data : null, // events data for selected month/year
  load : (init) => {
    // (D1) LOAD DATA FROM IDB
    if (init) {
      // (D1-1) GET SELECTED MONTH YEAR
      // note - jan is 0 & dec is 11
      cal.sMth = document.getElementById("cal-mth").value;
      cal.sYear = document.getElementById("cal-year").value;
      let sMth = +cal.sMth + 1;
      cal.sDays = new Date(cal.sYear, sMth, 0).getDate();

      // (D1-2) START & END OF MONTH
      if (sMth < 10) { sMth = "0" + sMth; }
      cal.sFirst = parseInt(cal.sYear + sMth + "01");
      cal.sLast = parseInt(cal.sYear + sMth + cal.sDays);

      // (D1-3) FETCH INIT
      // inefficient. but no other ways to do complex search in idb.
      cal.ready = 0;
      cal.data = {};
      document.getElementById("cal-wrap").innerHTML = "";
      let rangeA = IDBKeyRange.bound(cal.sFirst, cal.sLast),
          rangeB = IDBKeyRange.lowerBound(cal.sLast, true);

      // (D1-4) GET ALL START DATE THAT FALLS INSIDE MONTH/YEAR
      cal.iTX().index("start").openCursor(rangeA).onsuccess = (evt) => {
        let cursor = evt.target.result;
        if (cursor) {
          if (!cal.data[cursor.value.id]) {
            cal.data[cursor.value.id] = cursor.value;
          }
          cursor.continue();
        } else { cal.load(false); }
      };

      // (D1-5) GET ALL END DATE THAT FALLS INSIDE MONTH/YEAR
      cal.iTX().index("end").openCursor(rangeA).onsuccess = (evt) => {
        let cursor = evt.target.result;
        if (cursor) {
          if (!cal.data[cursor.value.id]) {
            cal.data[cursor.value.id] = cursor.value;
          }
          cursor.continue();
        } else { cal.load(false); }
      };

      // (D1-6) END DATE AFTER SELECTED MONTH/YEAR, BUT START IS BEFORE
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

    // (D2) WAIT FOR ALL DATA FETCH TO COMPLETE
    else {
      cal.ready++;
      if (cal.ready==3) { cal.draw(); }
    }
  },

  // (E) DRAW CALENDAR
  draw : () => {
    // (E1) PRE-CALCULATIONS
    // note - jan is 0 & dec is 11
    // note - sun is 0 & sat is 6
    let sMon = false, // week start on monday?
        sDay = new Date(cal.sYear, cal.sMth, 1).getDay(), // first day of the month
        eDay = new Date(cal.sYear, cal.sMth, cal.sDays).getDay(), // last day of the month
        now = new Date(), // current date
        nowMth = now.getMonth(), // current month
        nowYear = parseInt(now.getFullYear()), // current year
        nowDay = cal.sMth==nowMth && cal.sYear==nowYear ? now.getDate() : null ;

    // (E2) DRAWING CALCULATIONS
    // blank squares before start of month
    let squares = [];
    if (sMon && sDay != 1) {
      let blanks = sDay==0 ? 7 : sDay ;
      for (let i=1; i<blanks; i++) { squares.push("b"); }
    }
    if (!sMon && sDay != 0) {
      for (let i=0; i<sDay; i++) { squares.push("b"); }
    }

    // days of the month
    for (let i=1; i<=cal.sDays; i++) { squares.push(i); }

    // blank squares after end of month
    if (sMon && eDay != 0) {
      let blanks = eDay==6 ? 1 : 7-eDay;
      for (let i=0; i<blanks; i++) { squares.push("b"); }
    }
    if (!sMon && eDay != 6) {
      let blanks = eDay==0 ? 6 : 6-eDay;
      for (let i=0; i<blanks; i++) { squares.push("b"); }
    }

    // (E3) DRAW HTML CALENDAR
    // get container
    let container = document.getElementById("cal-wrap"),
        cTable = document.createElement("table");
    cTable.id = "cal-table";
    container.innerHTML = "";
    container.appendChild(cTable);

    // first row - day names
    let cRow = cTable.insertRow(),
        days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
    if (sMon) { days.push(days.shift()); }
    cRow.classList.add("cal-table-head");
    for (let d of days) {
      let cCell = cRow.insertCell();
      cCell.innerHTML = d;
    }

    // days in month
    let total = squares.length;
    cRow = cTable.insertRow(),
    cRow.classList.add("cal-table-day");
    for (let i=0; i<total; i++) {
      let cCell = cRow.insertCell();
      cCell.id = "cal-cell-" + squares[i];
      if (squares[i]=="b") { cCell.classList.add("blank"); }
      else {
        if (nowDay==squares[i]) { cCell.classList.add("today"); }
        cCell.innerHTML = `<div class="dd">${squares[i]}</div>`;
      }
      if (i!=0 && (i+1)%7==0) {
        cRow = cTable.insertRow();
        cRow.classList.add("cal-table-day");
      }
    }

    // (E4) DRAW EVENTS
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
        eRow.onclick = () => { cal.show(eid); };
        document.getElementById("cal-cell-" + i).appendChild(eRow);
      }
    }}
  },

  // (F) SHOW ADD/EDIT EVENT FORM
  id : null, // current event id
  show : (id) => {
    cal.id = id!==undefined ? +id : null;
    window.location.hash = "form";
  },

  // (G) GET EVENT ENTRY
  get : () => {
    // (G1) GET HEADER HTML ELEMENTS
    let htitle = document.getElementById("cal-form-title"),
        hdel = document.getElementById("cal-form-del");

    // (G2) SET TITLE + DELETE
    htitle.innerHTML = cal.id==null ? "Add Event" : "Edit Event" ;
    if (cal.id == null) { hdel.classList.add("ninja"); }
    else {
      hdel.onclick = () => { cal.del(); };
      hdel.classList.remove("ninja");
    }

    // (G3) IF EDIT - GET NOTE ENTRY
    if (cal.id) {
      let req = cal.iTX().get(cal.id);
      req.onsuccess = () => {
        let e = req.result,
            eStart = e.start.toString(),
            eEnd = e.end.toString();
        eStart = [eStart.substr(0,4), eStart.substr(4,2), eStart.substr(6,2)].join("-");
        eEnd = [eEnd.substr(0,4), eEnd.substr(4,2), eEnd.substr(6,2)].join("-");

        document.getElementById("cal-e-start").value = eStart;
        document.getElementById("cal-e-end").value = eEnd;
        document.getElementById("cal-e-txt").value = e.evt;
        document.getElementById("cal-e-color").value = e.color;
      };
    } else {
      document.getElementById("cal-e-start").value = "";
      document.getElementById("cal-e-end").value = "";
      document.getElementById("cal-e-txt").value = "";
      document.getElementById("cal-e-color").value = "#e0eeff";
    }
  },

  // (H) SAVE EVENT
  save : () => {
    // (H1) DATE CHECK
    let eStart = document.getElementById("cal-e-start").value,
        eEnd = document.getElementById("cal-e-end").value;
    if (new Date(eStart) > new Date(eEnd)) {
      alert("Start date cannot be later than end date");
      return false;
    }

    // (H2) DATA TO SAVE
    let data = {
      start : +eStart.replaceAll("-", ""),
      end : +eEnd.replaceAll("-", ""),
      evt : document.getElementById("cal-e-txt").value,
      color : document.getElementById("cal-e-color").value
    };

    // (H3) SAVE ENTRY
    if (cal.id) {
      data.id = cal.id;
      cal.iTX().put(data);
    } else { cal.iTX().add(data); }

    // (H4) DONE!
    cb.info("Event saved");
    cal.id = null;
    window.location.hash = "home";
    return false;
  },

  // (J) DELETE EVENT
  del : () => { if (confirm("Delete Event?")) {
    cal.iTX().delete(cal.id);
    cb.info("Event deleted");
    cal.id = null;
    window.location.hash = "home";
  }}
};
window.addEventListener("DOMContentLoaded", cal.init);
