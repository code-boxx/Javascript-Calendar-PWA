<!-- (A) HEADER -->
<header class="cb-head">
  <!-- (A1) TITLE -->
  <h1 class="cb-head-title" id="cal-form-title"></h1>

  <!-- (A2) BUTTONS -->
  <div class="cb-head-btn">
    <a class="btn-ico mi" href="#home">reply</a>
    <button class="btn-ico mi" id="cal-form-del">delete</button>
  </div>
</header>

<!-- (C) CALENDAR EVENT FORM -->
<form id="cal-form" class="cb-body cb-form" onsubmit="return cal.save()">
  <label for="cal-e-start" class="form-field">Start Date</label>
  <input type="date" class="form-field" id="cal-e-start" required/>
  <label for="cal-e-end" class="form-field">End Date</label>
  <input type="date" class="form-field" id="cal-e-end" required/>
  <label for="cal-e-txt" class="form-field">Event</label>
  <textarea class="form-field" id="cal-e-txt" required></textarea>
  <label for="cal-e-color" class="form-field">Color</label>
  <input type="color" class="form-field" id="cal-e-color" required/>
  <input class="form-field btn-red" id="cal-save" type="submit" value="Save"/>
</form>
