'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  clickNumber = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
  }

  // prettier-ignore
  _setDescription() {
    this.type === 'running'
      ? (this.description = `Пробежка ${new Intl.DateTimeFormat('Ru-ru').format(this.date)}`)
      : (this.description = `Велотренировка ${new Intl.DateTimeFormat('Ru-ru').format(this.date)}`);
  }

  click() {
    this.clickNumber++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;

    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    this.pace = this.duration / this.distance; // min/km
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;

    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    this.speed = (this.distance / this.duration) * 60; // km/h
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Получение местоположения пользователя
    this._getPosition();

    // Получение данных из localStorage
    this._getLocalStorageData();

    // Добавление обработчика события

    form.addEventListener('submit', this._newWorkout.bind(this));

    // Меняем поле Темп на Подъем при выборе Велосипед
    inputType.addEventListener('change', this._toggleClimbField);

    // Переход карты к маркеру по клику на тренировку в боковой панели
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),

        function () {
          alert('Невозможно получить ваше местоположение');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
      .openPopup();

    // Обработка клика на карте
    this.#map.on('click', this._showForm.bind(this));

    // Отображение тренировок из localStorage на карте
    this.#workouts.forEach(workout => {
      this._displayWorkout(workout);
    });
  }

  _showForm(e) {
    // **
    this.#mapEvent = e; // **
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // prettier-ignore
    inputClimb.value = inputDistance.value = inputDuration.value = inputTemp.value = '';
    form.classList.add('hidden');
  }

  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));

    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

    e.preventDefault();

    // console.log(mapEvent); // содержит latlng: v {lat: 43.5696294867803, lng: 39.76277768611909} // от latitulde, longitude

    const { lat, lng } = this.#mapEvent.latlng; // получаем координаты
    let workout;

    // Получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const temp = +inputTemp.value;
      // проверка валидности данных
      if (
        !areNumbers(distance, duration, temp) ||
        !areNumbersPositive(distance, duration, temp)
      )
        return alert('Введите положительное число'); // guard clause - Тоже тренд современного JS

      workout = new Running([lat, lng], distance, duration, temp);
    }

    // Если тренировка является велотренировкой, создать объект Cycling
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      // проверка валидности данных
      if (
        !areNumbers(distance, duration, climb) ||
        !areNumbersPositive(distance, duration)
      )
        return alert('Введите положительное число');

      workout = new Cycling([lat, lng], distance, duration, climb);
    }

    // Добавить новый объект в массив тренировок
    this.#workouts.push(workout);

    // Отобразить тренировку на карте
    this._displayWorkout(workout);

    // Отобразить тренировку в списке
    this._displayWorkoutOnSidebar(workout);

    // Очистить поля ввода данных и спрятать форму
    this._hideForm();

    // Добавить все тренировки в локальное хранилище
    this._addWorkoutsToLocalStorage();
  }

  // prettier-ignore
  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description}`)
      .openPopup();
  }

  // prettier-ignore
  _displayWorkoutOnSidebar(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚵‍♂️'}</span>
          <span class="workout__value workout__value--distance">${workout.distance}</span>
          <span class="workout__unit">км</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value workout__value--duration">${workout.duration}</span>
          <span class="workout__unit">мин</span>
        </div>
        `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value workout__value--pace">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">м/мин</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value workout__value--temp">${workout.temp}</span>
            <span class="workout__unit">шаг/мин</span>
          </div>
          <div class="workout__btns">
            <button class="workout-btn workout__edit-btn">Edit</button>
            <button class="workout-btn workout__delete-btn">Remove</button>
          </div>
        </li>
        
      `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value workout__value--speed">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value workout__value--climb">${workout.climb}</span>
            <span class="workout__unit">м</span>
          </div>
          <div class="workout__btns">
            <button class="workout-btn workout__edit-btn">Edit</button>
            <button class="workout-btn workout__delete-btn">Remove</button>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToWorkout(e) {
    const workoutElement = e.target.closest('.workout');
    // Если кликнуть вне элемента workout, мы получим null, нам надо такие клики игнорировать
    if (!workoutElement) return;

    // prettier-ignore
    const workout = this.#workouts.find(item => item.id === workoutElement.dataset.id)

    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: { duration: 1 },
    });

    // запускаем функцию для кнопок, как раз удобно, когда клик по контейнеру с тренировками
    this._workoutBtnClickProcessing(e);
  }

  //
  //
  //
  //
  //
  //
  // Обрабатываем нажатие на кнопки тренировки
  #workoutElem; // для выбора тренировки, кнопку которой кликнули _buttonClickProcessing()

  _workoutBtnClickProcessing(e) {
    if (!e.target.classList.contains('workout-btn')) return;

    this.#workoutElem = e.target.closest('.workout');

    if (e.target === this.#workoutElem.querySelector('.workout__edit-btn')) {
      this._editWorkout(e);
    }
    if (e.target === this.#workoutElem.querySelector('.workout__delete-btn')) {
      this._removeWorkout();
    }
  }

  _editWorkout(e) {
    // We edit the ${this.#workoutElem.dataset.id} workout

    // получить localStorage, получить тренировки
    const workoutsJSON = JSON.parse(localStorage.getItem('workouts'));
    // prettier-ignore
    const workoutJSON = workoutsJSON.find(el => el.id === this.#workoutElem.dataset.id)
    // console.log(workoutJSON);

    // Удалить отображение старых данных
    // prettier-ignore
    const workoutDetails = this.#workoutElem.querySelectorAll('.workout__details');
    workoutDetails.forEach(detail => detail.remove());

    console.log(e.target.closest('.workout').querySelector('.workout__title'));
    e.target
      .closest('.workout')
      .querySelector('.workout__title')
      .insertAdjacentHTML(
        'afterend',
        `<form class="form">
      <div class="form__row">
        <label class="form__label">Тип</label>
        <select class="form__input form__input--type">
          <option value="running">Пробежка</option>
          <option value="cycling">Велосипед</option>
        </select>
      </div>
      <div class="form__row">
        <label class="form__label">Расстояние</label>
        <input class="form__input form__input--distance" placeholder="km" />
      </div>
      <div class="form__row">
        <label class="form__label">Длительность</label>
        <input class="form__input form__input--duration" placeholder="мин" />
      </div>
      <div class="form__row">
        <label class="form__label">Темп</label>
        <input class="form__input form__input--temp" placeholder="шаг/мин" />
      </div>
      <div class="form__row form__row--hidden">
        <label class="form__label">Подъём</label>
        <input class="form__input form__input--climb" placeholder="метров" />
      </div>
      <button class="form__btn">OK</button>
    </form>`
      );

    e.target.closest('.workout').style.display = 'block';
    e.target.closest('.workout').querySelector(form).style.paddingLeft = '0px';

    // отобразить форму ввода новых данных
    // const classToKeyMap = {
    //   'workout__value--distance': 'distance',
    //   'workout__value--duration': 'duration',
    //   'workout__value--pace': 'pace',
    //   'workout__value--temp': 'temp',
    //   'workout__value--speed': 'speed',
    //   'workout__value--climb': 'climb',
    // };
    // // prettier-ignore
    // const workoutDetails = this.#workoutElem.querySelectorAll('.workout__value');

    // workoutDetails.forEach(detail => {
    //   for (const className in classToKeyMap) {
    //     if (detail.classList.contains(className)) {
    //       const key = classToKeyMap[className];
    //       detail.innerHTML = `<input class="form__input form__input--${key}" placeholder="${workoutJSON[key]}" />`;

    //       break; // Break the loop once we've found a matching class
    //     }
    //   }
    // });

    // Принять новые значения из полей, поместить их в workoutJSON или workoutsJSON

    // сохранить в localStorage

    // отобразить измененный список тренировок
  }

  _removeWorkout() {
    // We remove the ${this.#workoutElem.dataset.id} workout
  }

  //
  //
  //
  //

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebar(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  // а вызвать reset() можно в консоли, пишем app.reset()
}

const app = new App();
