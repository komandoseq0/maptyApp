'use strict';

class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);
	clicks = 0;

	constructor(coords, distance, duration) {
		// this.date = ...
		// this.id = ...
		this.coords = coords; // [lat, lng]
		this.distance = distance; // in km
		this.duration = duration; // in min
	}

	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
			months[this.date.getMonth()]
		} ${this.date.getDate()}`;
	}

	click() {
		this.clicks++;
	}
}

class Running extends Workout {
	type = 'running';

	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		// min/km
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = 'cycling';

	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		// this.type = 'cycling';
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		// km/h
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const formAdd = document.querySelector('.formAdd');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllWorkouts = document.querySelector('.deleteAll');
const sortType = document.querySelector('.sortType');
const sort = document.querySelector('.sort');
const errorMessage = document.querySelector(".errorMessage");
const errorMessageText = document.querySelector(".errorMessageText");
const exitErrorMsg = document.querySelector(".exitErrorMsg");
const seeAllWorkouts = document.querySelector(".seeAllWorkouts");
let formEdit;
let inputTypeEdit;
let inputDistanceEdit;
let inputDurationEdit;
let inputCadenceEdit;
let inputElevationEdit;

class App {
	#map;
	#mapZoomLevel = 13;
	#mapEvent;
	#workouts = [];

	constructor() {
		// Get user's position
		this._getPosition();

		// Get data from local storage
		this._getLocalStorage();

		// Attach event handlers
		formAdd.addEventListener('submit', this._addWorkout.bind(this));
		inputType.addEventListener('change', this._toggleElevationField);
		containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
		containerWorkouts.addEventListener('click', this._showEditForm.bind(this));
		containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
		deleteAllWorkouts.addEventListener(
			'click',
			this._deleteWorkouts.bind(this)
		);
		sort.addEventListener('change', this._sortWorkouts.bind(this));
		exitErrorMsg.addEventListener("click", this._toggleError);
		seeAllWorkouts.addEventListener("click", this._seeAllWorkouts.bind(this));

		// sortType.addEventListener('change', this._sortWorkouts.bind(this));
	}

	_getPosition() {
		if (navigator.geolocation)
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function () {
					alert('Could not get your position');
				}
			);
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		// console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

		const coords = [latitude, longitude];

		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		// Handling clicks on map
		console.log(this);
		this.#map.on('click', this._showForm.bind(this));

		this.#workouts.forEach((work) => {
			this._renderWorkoutMarker(work);
		});
	}

	_seeAllWorkouts() {
		const allWorkoutsCoords = this.#workouts.map(workout => workout.coords);
		this.#map.fitBounds(allWorkoutsCoords);
	}

	_showForm(mapE) {
		if (mapE.originalEvent.target === seeAllWorkouts) {
			return
		};
		this.#mapEvent = mapE;
		formAdd.classList.remove('hidden');
		inputDistance.focus();
	}

	_hideForm() {
		// Empty inputs
		inputDistance.value =
			inputDuration.value =
			inputCadence.value =
			inputElevation.value =
				'';

		formAdd.style.display = 'none';
		formAdd.classList.add('hidden');
		setTimeout(() => (formAdd.style.display = 'grid'), 1000);
	}

	_toggleError(errorMsg) {
		const errorMsgText = errorMessageText.textContent;

		if (errorMsgText === '') {
			errorMessageText.textContent = errorMsg;
		} else {
			errorMessageText.textContent = "";
		}
		
		errorMessage.classList.toggle("hidden");
	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	_validInputs(...inputs) {
		return inputs.every((inp) => Number.isFinite(inp));
	}

	_allPositiveInputs(...inputs) {
		return inputs.every((inp) => inp > 0);
	}

	_addWorkout(e) {
		e.preventDefault();

		// Get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// If workout running, create running object
		if (type === 'running') {
			const cadence = +inputCadence.value;

			// Check if data is valid
			if (
				// !Number.isFinite(distance) ||
				// !Number.isFinite(duration) ||
				// !Number.isFinite(cadence)
				!this._validInputs(distance, duration, cadence) ||
				!this._allPositiveInputs(distance, duration, cadence)
			)
				return this._toggleError("Inputs have to be positive numbers!");
			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout cycling, create cycling object
		if (type === 'cycling') {
			const elevation = +inputElevation.value;

			if (
				!this._validInputs(distance, duration, elevation) ||
				!this._allPositiveInputs(distance, duration)
			)
				return this._toggleError("Inputs have to be positive numbers!");

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add new object to workout array
		this.#workouts.push(workout);

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Render workout on list
		this._renderWorkout(workout);

		// Hide form + clear input fields
		this._hideForm();

		// Set local storage to all workouts
		this._setLocalStorage();
	}

	_renderWorkoutMarker(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(
				`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
			)
			.openPopup();
	}

	_renderWorkout(workout) {
		let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon typeValue">${
						workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
					}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value durationValue">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

		if (workout.type === 'running')
			html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value paceValue">${workout.pace.toFixed(
						1
					)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value cadanceValue">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      `;

		if (workout.type === 'cycling')
			html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value paceValue">${workout.speed.toFixed(
						1
					)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value elevationValue">${
						workout.elevationGain
					}</span>
          <span class="workout__unit">m</span>
        </div>
      `;

		html += `
          <div class="workout__manage">
            <div class="workout__buttonBox">
              <button class="workout__edit">Edit</button>
            </div>
            <div class="workout__buttonBox">
              <button class="workout__delete">Delete</button>
            </div>
          </div>
          </li>
    `;

		formAdd.insertAdjacentHTML('afterend', html);
	}

	_moveToPopup(e) {
		// BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
		if (!this.#map) return;
		if (
			e.target.classList.contains('workout__edit') ||
			e.target.classList.contains('workout__delete')
		)
			return;

		const workoutEl = e.target.closest('.workout');

		if (!workoutEl) return;

		const workout = this.#workouts.find(
			(work) => work.id === workoutEl.dataset.id
		);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});

		// using the public interface
		// workout.click();
	}

	_hideEditForm() {
		formEdit.classList.add('hidden');
		removeEventListener('submit', formEdit);
		formEdit.remove();
		formEdit = undefined;
		inputTypeEdit = undefined;
		inputDistanceEdit = undefined;
		inputDurationEdit = undefined;
		inputCadenceEdit = undefined;
		inputElevationEdit = undefined;
	}

	_showEditForm(e) {
		if (!this.#map) return;
		if (!e.target.classList.contains('workout__edit')) return;
		if (formEdit) {
			this._hideEditForm();
			return;
		}

		const workoutEl = e.target.closest('.workout');

		const workout = this.#workouts.find(
			(work) => work.id === workoutEl.dataset.id
		);

		let html = `
			<form class="form hidden formEdit">
				<div class="form__row">
				  <label class="form__label">Type</label>
				  <select class="form__input form__inputEdit--type">
					<option value="running">Running</option>
					<option value="cycling">Cycling</option>
				  </select>
				</div>
				<div class="form__row">
				  <label class="form__label">Distance</label>
				  <input class="form__input form__inputEdit--distance" placeholder="km" />
				</div>
				<div class="form__row">
				  <label class="form__label">Duration</label>
				  <input class="form__input form__inputEdit--duration" placeholder="min" />
				</div>
			`;

		if (workout.type === 'running') {
			html += `
				<div class="form__row">
				  <label class="form__label">Cadence</label>
				  <input class="form__input form__inputEdit--cadence" placeholder="step/min" />
				</div>
				<div class="form__row form__row--hidden">
				  <label class="form__label">Elev Gain</label>
				  <input class="form__input form__inputEdit--elevation" placeholder="meters" />
				</div>
				<button class="form__btn">OK</button>
				</form>
			`;
		}

		if (workout.type === 'cycling') {
			html += `
				<div class="form__row form__row--hidden">
				  <label class="form__label">Cadence</label>
				  <input class="form__input form__inputEdit--cadence" placeholder="step/min" />
				</div>
				<div class="form__row">
				  <label class="form__label">Elev Gain</label>
				  <input class="form__input form__inputEdit--elevation" placeholder="meters" />
				</div>
				<button class="form__btn">OK</button>
				</form>
			`;
		}

		workoutEl.insertAdjacentHTML('afterend', html);
		formEdit = document.querySelector('.formEdit');
		formEdit.addEventListener('submit', (e) =>
			this._editForm(e, workout, workoutEl)
		);
		inputTypeEdit = document.querySelector('.form__inputEdit--type');
		inputDistanceEdit = document.querySelector('.form__inputEdit--distance');
		inputDurationEdit = document.querySelector('.form__inputEdit--duration');
		inputCadenceEdit = document.querySelector('.form__inputEdit--cadence');
		inputElevationEdit = document.querySelector('.form__inputEdit--elevation');
		inputTypeEdit.addEventListener('change', this._toggleElevationFieldEdit);

		if (workout.type === 'running') {
			inputTypeEdit.value = workout.type;
			inputDistanceEdit.value = workout.distance;
			inputDurationEdit.value = workout.duration;
			inputCadenceEdit.value = workout.duration;
		}

		if (workout.type === 'cycling') {
			inputTypeEdit.value = workout.type;
			inputDistanceEdit.value = workout.distance;
			inputDurationEdit.value = workout.duration;
			inputElevationEdit.value = workout.elevationGain;
		}

		setTimeout(() => {
			formEdit.classList.remove('hidden');
		}, 1);
	}

	_toggleElevationFieldEdit() {
		inputElevationEdit
			.closest('.form__row')
			.classList.toggle('form__row--hidden');
		inputCadenceEdit
			.closest('.form__row')
			.classList.toggle('form__row--hidden');
	}

	_editForm(e, workout, workoutEl) {
		// console.log(e);
		e.preventDefault();

		// Get data from form
		const type = inputTypeEdit.value;
		const distance = +inputDistanceEdit.value;
		const duration = +inputDurationEdit.value;

		// Get data from old workout
		const id = workout.id;
		const coords = workout.coords;
		const indexOfWorkout = this.#workouts.indexOf(workout);

		console.log(id, coords);

		// If workout running, create running object
		if (type === 'running') {
			const cadence = +inputCadenceEdit.value;

			if (
				!this._validInputs(distance, duration, cadence) ||
				!this._allPositiveInputs(distance, duration, cadence)
			)
				return this._toggleError("Inputs have to be positive numbers!");

			workout = new Running(coords, distance, duration, cadence);
			workout.id = id;
		}

		// If workout cycling, create cycling object
		if (type === 'cycling') {
			const elevation = +inputElevationEdit.value;

			if (
				!this._validInputs(distance, duration, elevation) ||
				!this._allPositiveInputs(distance, duration)
			)
				return this._toggleError("Inputs have to be positive numbers!");

			workout = new Cycling(coords, distance, duration, cadence);
			workout.id = id;
		}

		// Delete old workout element
		workoutEl.remove();

		// Repalce old workout with new
		this.#workouts[indexOfWorkout] = workout;

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Replace values
		this._renderWorkout(workout);

		// Hide form + clear input fields
		this._hideEditForm();

		// Set local storage to all workouts
		this._setLocalStorage();
	}

	_deleteWorkout(e) {
		if (!this.#map) return;
		if (!e.target.classList.contains('workout__delete')) return;
		if (formEdit) {
			this._toggleError("Workout is currently edited");
			return;
		}

		// Getting workout element
		const workoutEl = e.target.closest('.workout');

		// Finding workout in array
		const workout = this.#workouts.find(
			(work) => work.id === workoutEl.dataset.id
		);

		// Getting workout index
		const workoutId = this.#workouts.indexOf(workout);

		// Removing workout from array
		this.#workouts.splice(workoutId, 1);

		// Removing workout element from list
		workoutEl.remove();

		// Set local storage to all workouts without deleted workout
		this._setLocalStorage();
	}

	_deleteWorkouts() {
		if (!this.#map) return;
		if (formEdit) {
			this._toggleError("Workout is currently edited")
			return;
		}

		const allWorkouts = document.querySelectorAll('li');
		allWorkouts.forEach((workout) => workout.remove());

		this.#workouts = [];
		this._setLocalStorage();
	}

	_sortWorkouts() {
		const sortDirection = sort.value; // 'asc' lub 'dsc'
		const sortTypeValue = sortType.value; // 'date', 'distance', 'duration'

		let workoutsTempArray = this.#workouts.slice(); // kopia tablicy

		const compare = (key) => {
			if (sortDirection === 'asc') return (a, b) => a[key] - b[key];
			if (sortDirection === 'dsc') return (a, b) => b[key] - a[key];
		};

		if (sortTypeValue === 'date') {
			workoutsTempArray.sort(
				sortDirection === 'asc' ? (a, b) => a.id - b.id : (a, b) => b.id - a.id
			);
		}

		if (sortTypeValue === 'distance') {
			workoutsTempArray.sort(compare('distance'));
		}

		if (sortTypeValue === 'duration') {
			workoutsTempArray.sort(compare('duration'));
		}

		// Wyczyść stare elementy
		document.querySelectorAll('li').forEach((workout) => workout.remove());

		// Renderuj w nowej kolejności
		workoutsTempArray.forEach((workout) => this._renderWorkout(workout));
	}

	_setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));

		if (!data) return;

		this.#workouts = data;

		this.#workouts.forEach((work) => {
			this._renderWorkout(work);
		});
	}

	reset() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}

const app = new App();
