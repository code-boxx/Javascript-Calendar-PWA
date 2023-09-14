var calDB = {
  // (A) PROPERTIES
  db : null, // database object
  cache : null, // storage cache object
  cname : "SQLDB", // cache storage name
  dbname : "/calendar.sqlite", // database storage name

  // (B) INITIALIZE
  init : async () => {
    // (B1) STORAGE CACHE
    calDB.cache = await caches.open(calDB.cname);

    // (B2) ATTEMPT TO LOAD DATABASE FROM STORAGE CACHE
    calDB.cache.match(calDB.dbname).then(async r => {
      // (B2-1) SQLJS
      const SQL = await initSqlJs({
        locateFile: filename => `assets/${filename}`
      });

      // (B2-2) NOPE - CREATE A NEW DATABASE
      if (r==undefined) {
        calDB.db = new SQL.Database();
        calDB.db.run(`CREATE TABLE events (
          evt_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          evt_start TEXT NOT NULL,
          evt_end TEXT NOT NULL,
          evt_text TEXT NOT NULL,
          evt_color TEXT NOT NULL,
          evt_bg TEXT NOT NULL
        )`);
        calDB.db.run("CREATE INDEX evt_start ON events (evt_start)");
        calDB.db.run("CREATE INDEX evt_end ON events (evt_end)");
        await calDB.export();
        cal.initB();
      }

      // (B2-3) LOAD EXISTING DATABASE
      else {
        const buf = await r.arrayBuffer();
        calDB.db = new SQL.Database(new Uint8Array(buf));
        cal.initB();
      }
    });
  },

  // (C) EXPORT TO CACHE STORAGE
  export : async () => await calDB.cache.put(
    calDB.dbname, new Response(calDB.db.export())
  ),

  // (D) SAVE EVENT
  //  data is an array!
  //  data[0] = start date
  //  data[1] = end date
  //  data[2] = event text
  //  data[3] = text color
  //  data[4] = background color
  //  data[5] = optional event id (is an update if specified)
  save : async (data) => {
    const sql = data.length==6
      ? "UPDATE events SET evt_start=?, evt_end=?, evt_text=?, evt_color=?, evt_bg=? WHERE evt_id=?"
      : "INSERT INTO events (evt_start, evt_end, evt_text, evt_color, evt_bg) VALUES (?,?,?,?,?)" ;
    calDB.db.run(sql, data);
    await calDB.export();
  },

  // (E) DELETE EVENT
  del : async (id) => {
    calDB.db.run("DELETE FROM events WHERE evt_id=?", [id]);
    await calDB.export();
  },

  // (F) GET EVENT
  get : id => 
    (calDB.db.prepare("SELECT * FROM events WHERE evt_id=$eid"))
    .getAsObject({$eid:id}),

  // (G) GET EVENTS FOR GIVEN PERIOD
  getPeriod : (start, end) => {
    // (G1) SQL QUERY
    const stmt = calDB.db.prepare(`SELECT * FROM events WHERE (
      (evt_start BETWEEN $start AND $end)
      OR (evt_end BETWEEN $start AND $end)
      OR (evt_start <= $start AND evt_end >= $end)
    )`);
    stmt.bind({$start:start, $end:end});

    // (G2) DATA YOGA
    // s & e : start & end date
    // c & b : text & background color
    // t : event text
    let events = {};
    while (stmt.step()) {
      const r = stmt.getAsObject();
      events[r["evt_id"]] = {
        "s" : r["evt_start"],
        "e" : r["evt_end"],
        "t" : r["evt_text"],
        "c" : r["evt_color"],
        "b" : r["evt_bg"]
      };
    }
    return events;
  }
};