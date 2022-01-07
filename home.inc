<!-- (A) HEADER -->
<header class="cb-head">
  <!-- (A1) TITLE -->
  <h1 class="cb-head-title">My Calendar</h1>

  <!-- (A2) BUTTONS -->
  <div class="cb-head-btn">
    <button class="btn-ico mi" onclick="cal.show()">add_box</button>
  </div>
</header>

<!-- (B) CALENDAR -->
<div class="cb-body">
  <!-- (B1) MONTH YEAR SELECTORS -->
  <div id="cal-date">
    <select id="cal-mth"></select>
    <select id="cal-year"></select>
  </div>

  <!-- (B2) CALENDAR ITSELF -->
  <div id="cal-wrap"></div>
</div>
