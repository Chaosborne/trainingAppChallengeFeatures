'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const sidebar = document.querySelector('.sidebar');

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
  #workoutId;

  constructor() {
    // Получение местоположения пользователя
    this._getPosition();

    // Получение данных из localStorage
    this._getLocalStorageData();

    // Добавление обработчика события
    this.submitListenerLink = this._newWorkout.bind(this); // чтобы иметь доступ в _showEditForm() для отмены слушателя
    form.addEventListener('submit', this.submitListenerLink);
    // form.addEventListener('submit', this._newWorkout.bind(this));

    // Меняем поле Темп на Подъем при выборе Велосипед
    inputType.addEventListener('change', this._toggleClimbField);

    // Переход карты к маркеру по клику на тренировку в боковой панели
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));

    // Отображение кнопки редактирования тренировки по клику на тренировку в боковой панели
    containerWorkouts.addEventListener('click', this._showEditBtn.bind(this));
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
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // prettier-ignore
  _showEditForm(e) {

    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();

    // Заменяем слушатель события
    form.removeEventListener('submit', this.submitListenerLink);
    form.addEventListener('submit', this._editWorkout.bind(this))
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

  _editWorkout(e) {
    e.preventDefault();
    // Достать значение из localStorage, сделать JSON.parse
    this.#workouts = JSON.parse(localStorage.getItem('workouts'));

    // Получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Внести изменения в JSON
    // используем this.#workoutId из _showEditBtn
    // prettier-ignore
    let changeableWorkout = this.#workouts.find(el => el.id === this.#workoutId);

    // Помещаем новые данные
    // проверка валидности данных
    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));
    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);
    // помещение данных в зависимости от типа тренировки
    if (type === 'running') {
      const temp = +inputTemp.value;
      if (
        !areNumbers(distance, duration, temp) ||
        !areNumbersPositive(distance, duration, temp)
      )
        return alert('Введите положительное число'); // guard clause - Тоже тренд современного JS

      changeableWorkout.type = type;
      changeableWorkout.distance = distance;
      changeableWorkout.duration = duration;
      changeableWorkout.temp = temp;
    }
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      if (
        !areNumbers(distance, duration, climb) ||
        !areNumbersPositive(distance, duration)
      )
        return alert('Введите положительное число');

      changeableWorkout.type = type;
      changeableWorkout.distance = distance;
      changeableWorkout.duration = duration;
      changeableWorkout.climb = climb;
    }

    // Помещаем обновленный массив с тренировками в localStorage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    // Отобразить обновленную тренировку в списке
    // очистить сайдбар
    sidebar.innerHTML = '';
    document.location.reload();

    // отобразить актуальные тренировки
    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebar(workout);
    });

    // Очистить поля ввода данных и спрятать форму
    this._hideForm();

    // Спрятать кнопку
    this._hideEditBtn();
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
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">км</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">мин</span>
        </div>
        `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">м/мин</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value">${workout.temp}</span>
            <span class="workout__unit">шаг/мин</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.climb}</span>
            <span class="workout__unit">м</span>
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

    // workout.click();
    // console.log(workout);
  }

  _showEditBtn(e) {
    if (!e.target.closest('.workout')) return;
    if (document.querySelector('.workout-edit__btn')) return;

    this.#workoutId = e.target.closest('.workout').dataset.id;

    // if ( // can do this, but like guard clause most
    //   !document.querySelector('.workout-edit__btn') &&
    //   !e.target.classList.contains('workouts')
    // ) {
    e.target
      .closest('.workout')
      .insertAdjacentHTML(
        'beforeEnd',
        '<button class = "workout-edit__btn">Редактировать тренировку</button>'
      );
    document
      .querySelector('.workout-edit__btn')
      .addEventListener('click', this._showEditForm.bind(this));
    // }
  }

  _hideEditBtn() {
    document
      .querySelector('.workout-edit__btn')
      .removeEventListener('click', this._showEditForm.bind(this));

    const button = document.querySelector('.workout-edit__btn');
    button.remove();
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

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  // а вызвать reset() можно в консоли, пишем app.reset()
}

const app = new App();
