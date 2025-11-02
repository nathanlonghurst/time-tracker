// State management
let currentDate = new Date();
let selectedDate = null;
let entries = [];

// View management
const calendarView = document.getElementById('calendar-view');
const entryView = document.getElementById('entry-view');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        showCalendarView();
    });

    document.getElementById('add-entry-btn').addEventListener('click', () => {
        addEntry();
    });

    document.getElementById('save-btn').addEventListener('click', () => {
        saveEntries();
    });

    document.getElementById('save-journal-btn').addEventListener('click', () => {
        saveJournal();
    });
}

// Calendar rendering
async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;

    // Get month summaries from API (current, previous, and next month)
    const prevMonthDate = new Date(year, month - 1, 1);
    const nextMonthDate = new Date(year, month + 1, 1);

    const [summary, prevSummary, nextSummary] = await Promise.all([
        fetchMonthSummary(year, month + 1),
        fetchMonthSummary(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1),
        fetchMonthSummary(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1)
    ]);

    // Combine all summaries
    const allSummary = { ...prevSummary, ...summary, ...nextSummary };

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Week total header
    const weekHeader = document.createElement('div');
    weekHeader.className = 'day-header';
    weekHeader.textContent = 'Week';
    grid.appendChild(weekHeader);

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Build all cells with week tracking
    let cellCount = 0;
    let weekTotal = 0;
    let weekDates = [];

    // Previous month days
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dateStr = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const cell = createDayCell(day, true, dateStr, false, allSummary[dateStr]);
        grid.appendChild(cell);
        cellCount++;

        // Add to weekly total
        if (allSummary[dateStr]) {
            weekTotal += allSummary[dateStr];
        }

        // End of week - add weekly total
        if (cellCount % 7 === 0) {
            const weekCell = createWeekTotalCell(weekTotal);
            grid.appendChild(weekCell);
            weekTotal = 0;
            weekDates = [];
        }
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year &&
                       today.getMonth() === month &&
                       today.getDate() === day;

        const cell = createDayCell(day, false, dateStr, isToday, allSummary[dateStr]);
        grid.appendChild(cell);
        cellCount++;

        // Add to week total
        if (allSummary[dateStr]) {
            weekTotal += allSummary[dateStr];
        }
        weekDates.push(dateStr);

        // End of week - add weekly total
        if (cellCount % 7 === 0) {
            const weekCell = createWeekTotalCell(weekTotal);
            grid.appendChild(weekCell);
            weekTotal = 0;
            weekDates = [];
        }
    }

    // Next month days
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;

    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        const dateStr = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const cell = createDayCell(day, true, dateStr, false, allSummary[dateStr]);
        grid.appendChild(cell);
        cellCount++;

        // Add to weekly total
        if (allSummary[dateStr]) {
            weekTotal += allSummary[dateStr];
        }

        // End of week - add weekly total
        if (cellCount % 7 === 0) {
            const weekCell = createWeekTotalCell(weekTotal);
            grid.appendChild(weekCell);
            weekTotal = 0;
            weekDates = [];
        }
    }
}

function createDayCell(day, isOtherMonth, dateStr = null, isToday = false, hours = null) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    if (isToday) {
        cell.classList.add('today');
    }

    if (hours) {
        cell.classList.add('has-entries');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    if (hours) {
        const dayHours = document.createElement('div');
        dayHours.className = 'day-hours';
        dayHours.textContent = `${hours.toFixed(2)}h`;
        cell.appendChild(dayHours);
    }

    // Make all days clickable if they have a date string
    if (dateStr) {
        cell.addEventListener('click', () => {
            openEntryView(dateStr);
        });
    }

    return cell;
}

function createWeekTotalCell(totalHours) {
    const cell = document.createElement('div');
    cell.className = 'week-total-cell';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = 'Total';
    cell.appendChild(label);

    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = totalHours > 0 ? `${totalHours.toFixed(1)}h` : '-';
    cell.appendChild(value);

    return cell;
}

// Entry view
async function openEntryView(dateStr) {
    selectedDate = dateStr;
    entries = await fetchEntries(dateStr);

    // Format date for display
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('entry-date').textContent = date.toLocaleDateString('en-US', options);

    renderEntries();

    // Load journal entry
    await loadJournal(dateStr);

    showEntryView();
}

function renderEntries() {
    const list = document.getElementById('entries-list');
    list.innerHTML = '';

    if (entries.length === 0) {
        addEntry();
    } else {
        entries.forEach((entry, index) => {
            list.appendChild(createEntryElement(entry, index));
        });
    }

    updateSummary();
}

function createEntryElement(entry, index) {
    const div = document.createElement('div');
    div.className = 'entry-item';

    div.innerHTML = `
        <div class="entry-header">
            <span class="entry-number">Entry ${index + 1}</span>
            <button class="delete-btn" onclick="deleteEntry(${index})">Delete</button>
        </div>
        <div class="entry-inputs">
            <div class="input-row">
                <div class="input-group">
                    <label>Start Time</label>
                    <input type="text" class="start-time" value="${entry.start_time || ''}"
                           placeholder="9:00 AM" data-index="${index}">
                </div>
                <div class="input-group">
                    <label>End Time</label>
                    <input type="text" class="end-time" value="${entry.end_time || ''}"
                           placeholder="5:00 PM" data-index="${index}">
                </div>
            </div>
            <div class="or-divider">OR</div>
            <div class="input-row">
                <div class="input-group">
                    <label>Hours</label>
                    <input type="number" class="direct-hours-hrs" value="${Math.floor(entry.hours || 0)}"
                           placeholder="8" min="0" data-index="${index}">
                </div>
                <div class="input-group">
                    <label>Minutes</label>
                    <input type="number" class="direct-hours-mins" value="${Math.round(((entry.hours || 0) % 1) * 60)}"
                           placeholder="0" min="0" max="59" data-index="${index}">
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const startTimeInput = div.querySelector('.start-time');
    const endTimeInput = div.querySelector('.end-time');
    const directHoursHrsInput = div.querySelector('.direct-hours-hrs');
    const directHoursMinsInput = div.querySelector('.direct-hours-mins');

    startTimeInput.addEventListener('input', (e) => handleTimeInput(index, e.target.value, endTimeInput.value));
    endTimeInput.addEventListener('input', (e) => handleTimeInput(index, startTimeInput.value, e.target.value));
    directHoursHrsInput.addEventListener('input', (e) => handleDirectHoursInput(index, e.target.value, directHoursMinsInput.value));
    directHoursMinsInput.addEventListener('input', (e) => handleDirectHoursInput(index, directHoursHrsInput.value, e.target.value));

    return div;
}

function handleTimeInput(index, startTime, endTime) {
    if (startTime && endTime) {
        const hours = calculateHours(startTime, endTime);
        if (hours > 0) {
            entries[index].start_time = startTime;
            entries[index].end_time = endTime;
            entries[index].hours = hours;
            updateSummary();
        }
    }
}

function handleDirectHoursInput(index, hours, minutes) {
    const hoursInt = parseInt(hours) || 0;
    const minutesInt = parseInt(minutes) || 0;

    // Convert to decimal hours
    const totalHours = hoursInt + (minutesInt / 60);

    if (totalHours >= 0) {
        entries[index].hours = totalHours;
        entries[index].start_time = null;
        entries[index].end_time = null;
        updateSummary();
    }
}

function calculateHours(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (!start || !end) return 0;

    let hours = end - start;
    if (hours < 0) hours += 24; // Handle overnight shifts

    return hours;
}

function parseTime(timeStr) {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const meridiem = match[3] ? match[3].toLowerCase() : null;

    if (meridiem === 'pm' && hours !== 12) {
        hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
    }

    return hours + minutes / 60;
}

function addEntry() {
    entries.push({
        start_time: null,
        end_time: null,
        hours: 0
    });
    renderEntries();
}

function deleteEntry(index) {
    entries.splice(index, 1);
    renderEntries();
}

function updateSummary() {
    const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const totalMinutes = Math.round(totalHours * 60);

    document.getElementById('total-hours').textContent = totalHours.toFixed(2);
    document.getElementById('total-minutes').textContent = totalMinutes;
}

async function saveEntries() {
    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: selectedDate,
                entries: entries
            })
        });

        if (response.ok) {
            alert('Entries saved successfully!');
            showCalendarView();
            renderCalendar();
        } else {
            alert('Failed to save entries');
        }
    } catch (error) {
        console.error('Error saving entries:', error);
        alert('Error saving entries');
    }
}

// API calls
async function fetchMonthSummary(year, month) {
    try {
        const response = await fetch(`/api/entries/month/${year}/${month}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching month summary:', error);
        return {};
    }
}

async function fetchEntries(date) {
    try {
        const response = await fetch(`/api/entries/${date}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching entries:', error);
        return [];
    }
}

// Journal functions
async function loadJournal(date) {
    try {
        const response = await fetch(`/api/journal/${date}`);
        const data = await response.json();
        document.getElementById('journal-text').value = data.content || '';
    } catch (error) {
        console.error('Error loading journal:', error);
        document.getElementById('journal-text').value = '';
    }
}

async function saveJournal() {
    const content = document.getElementById('journal-text').value;

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: selectedDate,
                content: content
            })
        });

        if (response.ok) {
            alert('Journal saved successfully!');
        } else {
            alert('Failed to save journal');
        }
    } catch (error) {
        console.error('Error saving journal:', error);
        alert('Error saving journal');
    }
}

// View switching
function showCalendarView() {
    calendarView.classList.add('active');
    entryView.classList.remove('active');
}

function showEntryView() {
    calendarView.classList.remove('active');
    entryView.classList.add('active');
}
