'use strict';

//
//
//
//
console.log(JSON.parse(localStorage.getItem('workouts')));
//
//
//
//

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

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    this.type === 'running'
      ? (this.description = `Пробежка ${new Intl.DateTimeFormat('Ru-ru').format(this.date)}`)
      : (this.description = `Велотренировка ${new Intl.DateTimeFormat('Ru-ru').format(this.date)}`);
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
  #workoutElem; // для выбора тренировки, кнопку которой кликнули _workoutEditBtnClickProcessing()
  #editTarget; // will contain a click target when initiate workout edit
  #editInputType;
  #editInputClimb;
  #editInputTemp;
  #workoutToChangeIndex;
  #workoutToChange;
  #changedDescription;
  #temp;
  #climb;
  #distance;
  #duration;

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
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert('Невозможно получить ваше местоположение');
      });
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup('A pretty CSS3 popup.<br> Easily customizable.').openPopup();

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

  _hideForm() {
    inputClimb.value = inputDistance.value = inputDuration.value = inputTemp.value = '';
    form.classList.add('hidden');
  }

  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const areNumbers = (...numbers) => numbers.every(num => Number.isFinite(num));
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
      if (!areNumbers(distance, duration, temp) || !areNumbersPositive(distance, duration, temp)) return alert('Введите положительное число');
      workout = new Running([lat, lng], distance, duration, temp);
    }

    if (type === 'cycling') {
      const climb = +inputClimb.value;
      if (!areNumbers(distance, duration, climb) || !areNumbersPositive(distance, duration)) return alert('Введите положительное число');
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

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup({ maxWidth: 200, minWidth: 100, autoClose: false, closeOnClick: false, className: `${workout.type}-popup` }))
      .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description}`)
      .openPopup();
  }

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

    const workout = this.#workouts.find(item => item.id === workoutElement.dataset.id);

    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: { duration: 1 },
    });

    // запускаем функцию для кнопок, как раз удобно, когда клик по контейнеру с тренировками
    this._workoutButtonHandler(e);
  }

  // Обрабатываем нажатие на кнопки тренировки
  _workoutButtonHandler(e) {
    if (!e.target.classList.contains('workout-btn')) return;

    this.#workoutElem = e.target.closest('.workout');

    if (e.target === this.#workoutElem.querySelector('.workout__edit-btn')) this._editWorkout(e);
    if (e.target === this.#workoutElem.querySelector('.workout__delete-btn')) this._removeWorkout(e);
  }

  _editWorkout(e) {
    // We edit the ${this.#workoutElem.dataset.id} workout

    // Удалить отображение старых данных
    const workoutDetails = this.#workoutElem.querySelectorAll('.workout__details');
    workoutDetails.forEach(detail => detail.remove());

    // отобразить форму ввода новых данных
    this._showEditFormInsideWorkout(e);

    // выбрать и стилить форму
    const workoutElem = e.target.closest('.workout');
    const editForm = workoutElem.querySelector('.form');
    workoutElem.style.display = 'block';
    editForm.style.paddingLeft = '0px';
    editForm.style.marginBottom = '0.6rem';

    editForm.addEventListener('submit', this._processEditFormData.bind(this));
  }

  _showEditFormInsideWorkout(e) {
    if (e.target.closest('.workout').querySelector('.form')) return;

    this.#editTarget = e.target.closest('.workout');

    this.#editTarget
      .closest('.workout')
      .querySelector('.workout__title')
      .insertAdjacentHTML(
        'afterend',
        `<form class="form">
      <div class="form__row">
        <label class="form__label">Тип</label>
        <select class="form__input form__input--type-edit">
          <option value="running">Пробежка</option>
          <option value="cycling">Велосипед</option>
        </select>
      </div>
      <div class="form__row">
        <label class="form__label">Расстояние</label>
        <input class="form__input form__input--distance-edit" placeholder="km" />
      </div>
      <div class="form__row">
        <label class="form__label">Длительность</label>
        <input class="form__input form__input--duration-edit" placeholder="мин" />
      </div>
      <div class="form__row">
        <label class="form__label">Темп</label>
        <input class="form__input form__input--temp-edit" placeholder="шаг/мин" />
      </div>
      <div class="form__row form__row--hidden">
        <label class="form__label">Подъём</label>
        <input class="form__input form__input--climb-edit" placeholder="метров" />
      </div>
      <button class="form__btn">OK</button>
    </form>`
      );

    // Устанавливаем select и инпут в зависимости от вида тренировки
    this.#editInputClimb = this.#editTarget.querySelector('.form__input--climb-edit');
    this.#editInputTemp = this.#editTarget.querySelector('.form__input--temp-edit');
    this.#editInputType = this.#editTarget.querySelector('.form__input--type-edit');

    const climbFormRow = this.#editInputClimb.closest('.form__row');
    const tempFormRow = this.#editInputTemp.closest('.form__row');

    if (this.#editTarget.classList.contains('workout--cycling')) {
      this.#editInputType.value = 'cycling';
      climbFormRow.classList.remove('form__row--hidden');
      tempFormRow.classList.add('form__row--hidden');
    }
    if (this.#editTarget.classList.contains('workout--running')) {
      this.#editInputType.value = 'running';
      climbFormRow.classList.add('form__row--hidden');
      tempFormRow.classList.remove('form__row--hidden');
    }

    // выясняем индекс элемента и элемент, который будем изменяить через эту форму
    this.#workoutToChangeIndex = this.#workouts.findIndex(workout => workout.id === `${this.#workoutElem.dataset.id}`);
    this.#workoutToChange = this.#workouts[this.#workoutToChangeIndex];

    // Включаем toggle элементам в зависимости от type select
    this.#editInputType.addEventListener('change', this._toggleEditProps.bind(this));
  }

  _toggleEditProps() {
    this.#editInputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    this.#editInputTemp.closest('.form__row').classList.toggle('form__row--hidden');

    // Разбиваем строку на слова
    const date = this.#workoutToChange.description.split(' ').pop();

    if (this.#editInputType.value === 'running') {
      this.#workoutElem.classList.replace('workout--cycling', 'workout--running');

      this.#changedDescription = 'Пробежка ' + date; // Формируем новую строку в зависимости от значения type
    }
    if (this.#editInputType.value === 'cycling') {
      this.#workoutElem.classList.replace('workout--running', 'workout--cycling');

      this.#changedDescription = 'Велосипед ' + date; // Формируем новую строку в зависимости от значения type
    }

    // Отображаем изменение описания в боковой панели
    this.#workoutElem.querySelector('.workout__title').textContent = `${this.#changedDescription}`;
    // Помещаем описание тренировки в JSON тренировки
    this.#workoutToChange.description = this.#changedDescription;
  }

  _processEditFormData(e) {
    e.preventDefault();
    // Теперь надо подставлять Темп или Подъем в зависимости от типа тренировки
    // заново выбираем элементы с такими классамим, т. к. они новые, и некоторые из них мы еще не выбирали в _showEditFormInsideWorkout()
    const editInputDistance = document.querySelector('.form__input--distance-edit');
    const editInputDuration = document.querySelector('.form__input--duration-edit');

    const areNumbers = (...numbers) => numbers.every(num => Number.isFinite(num));
    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

    this.#distance = +editInputDistance.value;
    this.#duration = +editInputDuration.value;

    if (this.#editInputType.value === 'running') {
      this.#temp = +this.#editInputTemp.value;
      if (!areNumbers(this.#distance, this.#duration, this.#temp) || !areNumbersPositive(this.#distance, this.#duration, this.#temp))
        return alert('Введите положительное число');

      this.#workoutToChange.temp = this.#temp;
      this.#workoutToChange.pace = this.#duration / this.#distance;
      if (this.#workoutToChange && this.#workoutToChange.climb) delete this.#workoutToChange.climb;
      if (this.#workoutToChange && this.#workoutToChange.speed) delete this.#workoutToChange.speed;
    }

    if (this.#editInputType.value === 'cycling') {
      this.#climb = +this.#editInputClimb.value;
      if (!areNumbers(this.#distance, this.#duration, this.#climb) || !areNumbersPositive(this.#distance, this.#duration))
        return alert('Введите положительное число');

      this.#workoutToChange.climb = this.#climb;
      this.#workoutToChange.speed = (this.#distance / this.#duration) * 60;
      if (this.#workoutToChange && this.#workoutToChange.temp) delete this.#workoutToChange.temp;
      if (this.#workoutToChange && this.#workoutToChange.pace) delete this.#workoutToChange.pace;
    }

    this.#workoutToChange.type = this.#editInputType.value;
    this.#workoutToChange.distance = this.#distance;
    this.#workoutToChange.duration = this.#duration;

    localStorage.clear(); // Очистить localStorage
    this._addWorkoutsToLocalStorage(); // записать в localStorage новые данные
    containerWorkouts.innerHTML = ''; // сначала очищаем контейнер для красоты работы интерфейса
    location.reload(); // Теперь отображаем новые данные на боковой панели
  }

  _removeWorkout() {
    // We remove the ${this.#workoutElem.dataset.id} workout
    this.#workouts = this.#workouts.filter(el => el.id != this.#workoutElem.dataset.id);
    localStorage.removeItem('workouts');
    // localStorage.clear();
    this._addWorkoutsToLocalStorage();
    location.reload();
  }

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

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
