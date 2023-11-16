'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
// let map, mapEvent; // так как они теперь работают в классе App, помещаем их объявление туда и делаем приватными полями класса

class Workout {
  date = new Date(); // The Date() constructor creates Date objects. When called as a function, it returns a string representing the current time (MDN)
  id = (Date.now() + '').slice(-10); // создаем идентификатор
  // (timestamp текущего момента + пустая строка).последние 10 символов этой строки
  // обычно создание идентификатора доверяется каким-либо библиотекам, так как, например, в реальном приложении может быть большое количество пользователей, и они могут создавать свои записи одновременно, поэтому, например time stamp, как в нашем случае, не подойдет.  id - это важная часть приложения. Но сейчас сделали вручную

  // * Бонус, просто для практики
  // используем API класса Workout
  clickNumber = 0;
  // *

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
    // this.description = `${this.type} ${this.date}`;
  }

  // *
  click() {
    this.clickNumber++;
  }
  // каждый объект будет иметь доступ к этому методу
  // *
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
    // min/km
    this.pace = this.duration / this.distance;
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
    // km/h
    this.speed = (this.distance / this.duration) * 60;
  }
}

// const running = new Running([50, 39], 7, 40, 170);
// const cycling = new Cycling([50, 39], 37, 80, 370);
// console.log(running, cycling);

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Получение местоположения пользователя
    // конструктор запускается при загрузке страницы и при создании объекта через const app = new App(); (ниже), поэтому запустится все, что в конструкторе
    this._getPosition();

    // Получение данных из localStorage
    this._getLocalStorageData();

    // Добавление обработчика события

    form.addEventListener('submit', this._newWorkout.bind(this)); // в обработчике события this всегда указывает на элемент, к которому прикреплен обработчик. В данном случае, к form. Поэтому привязываем this от App при помощи .bind(this). Теперь this._newWorkout - это не workout поля, а workout App
    // Всегда, когда слушатели события будут внутри класса, нужно будет связывать this при помощи .bind(this). Потому что в большинстве случаев надо, чтобы this указывало на сам объект

    // Меняем поле Темп на Подъем при выборе Велосипед
    inputType.addEventListener('change', this._toggleClimbField);

    // Переход карты к маркеру по клику на тренировку в боковой панели
    // Так как при загрузке приложения у нас еще нет ни одного элемента в списке тренировок, мы вешаем слушатель на родителя и делегируем событие
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // не указываем здесь скобки, так как не происходит моментальный вызов этого метода. JS вызовет его в качестве callback-функции, когда будет получена геопозиция пользователя, и JS передаст эту позицию в _loadMap. _loadMap - это sucess функция, которая принимает параметр, содержащий позицию, который принято называть position
        // Привязку .bind(this) делаем потому что в getCurrentPosition() эта sucсess-функция вызывается не как метод, а как функция. А у функций this указывает на undefined
        // И когда мы будем вызывать внизу this.#map = L.map('map').setView(coords, 18);, будет ошибка Cannot set properties of undefined (setting '#map')
        function () {
          alert('Невозможно получить ваше местоположение');
        }
        // /код с сайта LeafLet
      );
    }
  }

  _loadMap(position) {
    // const latitude = position.coords.latitude;
    const { latitude } = position.coords; // деструктуризация
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude},13z?entry=ttu`);

    // код с сайта LeafLet
    // Для L.map().setView() и L.marker() передаем наши координаты тоже в форме массива, т. к. они их так принимают (в исходном коде передается setView([51.505, -0.09], 13) и L.marker([51.5, -0.09]) )
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 15); // Для L.map('map') создаем <div id="map"></div> в документе, чтоб селектор совпадал у функции и элемента
    // В setView(coords, 13), 13 - это зум
    // L - главная функция приложения LeafLet, пространство имен, которое имеет несколько методов, таких как map(), setView() для map(), tileLayer() и т. д.
    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { // - это по умолчанию
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      // LeafLet может работать с разными картами, по умолчанию - https://tile.openstreetmap.org
      // Т. ж. этот URL может использоваться для изменения внешнего вида карты
      // другие стили можно найти на https://leaflet-extras.github.io/leaflet-providers/preview
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
      .openPopup();

    // в библиотеке LeafLet мы можем в вызываемой callback-функции обращение к событию, назовем его event

    // Делаем обработчик события клика по карте, чтобы потом отобразить метку, где пользователь кликнул
    // Нам надо точно знать, где на карте кликнул пользователь, поэтому не можем вешать eventListener, он отследить только клик по элементу
    // Поэтому делаем через map.on(). map.on() - это не метод языка JS, это функция в библиотеке LeafLet
    // объект, который находится в map, сгенерирован библиотекой LeafLet, и у этого объекта этой библиотеки есть несколько свойств и методов
    // метод on() очень похож на eventListener(), он так же принимает клик и callback-функцию

    // ОБработка клика на карте
    this.#map.on('click', this._showForm.bind(this)); // bind(this), так как callback-функция находится внутри обработчика события (.on - это тоже обработчик события в библиотеке LeafLet), в этой точке this указывает на саму карту. И при вызове _showForm() мы не можем найти this.#mapEvent у undefined. После привязки _showForm видит this от App

    // Отображение тренировок из localStorage на карте
    this.#workouts.forEach(workout => {
      this._displayWorkout(workout);
    });
  }

  _showForm(e) {
    // **
    this.#mapEvent = e; // **
    form.classList.remove('hidden');
    inputDistance.focus(); // сразу фокусируем курсор на поле Расстояние
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

    // **
    // ** указываем здесь параметр event (e) для того, чтобы в event.preventDefault(); event не зачеркивалось и не выдавалось, что event - deprecated. То есть, чтобы обращение шло к параметру - к нашему событию, а не к глобальной переменной event. Зачеркнутое глобальное event вроде и работать будет, но вопрос - правильно ли
    e.preventDefault(); // **
    // console.log(mapEvent); // содержит latlng: v {lat: 43.5696294867803, lng: 39.76277768611909} // от latitulde, longitude

    const { lat, lng } = this.#mapEvent.latlng; // получаем координаты
    let workout;

    // Получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value; // + - преобразовываем строку в число
    const duration = +inputDuration.value;

    // Если тренировка является пробежкой, создать объект Running
    if (type === 'running') {
      const temp = +inputTemp.value;
      // проверка валидности данных
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(temp)
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
    // Вместо if else используем два if. В современном JS так пишется все чаще. И код чище

    // Добавить новый объект в массив тренировок
    this.#workouts.push(workout); // выше инициализировали во внешнем скоупе, чтоб здесь видеть ее из наших if условий

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
    // создаем маркер в координатах клика
    // const { lat, lng } = this.#mapEvent.latlng; // Перенесли эту строку кода выше
    // L.marker(coords); // используем уже не coords - это координаты первого маркера (наши координаты геолокации при загрузке страницы, устаревшие для этой задачи координаты), а новый массив, только что созданный
    // чтобы надпись над маркером не исчезала, в метод bindPopup('Тренировка') вместо надписи передаем другой метод согласно документации LeafLet
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
    const workoutElement = e.target.closest('.workout'); // Куда бы мы ни кликнули внутри <ul class="workouts"> -> <li class="workout>, будет найден ближайший к кликнутому элементу (цели события) элемент c классом workout. Нам и нужно его выбрать в каждом таком случае и поместить в переменную workoutElement
    // console.log(workoutElement); // <li class="workout workout--running" data-id="3666438093"> ... </li>
    // Нам здесь важен data-id="3666438093", потому что по нему мы будем выбирать элемент, по которому центрировать карту

    // Если кликнуть вне элемента workout, мы получим null, нам надо такие клики игнорировать
    if (!workoutElement) return;

    // prettier-ignore
    const workout = this.#workouts.find(item => item.id === workoutElement.dataset.id)

    // В LeafLet есть метод setView(), который центрует карту по объекту. В коде ри начальной загруке приложения он тоже использован
    // первым аргументом он принимает координаты, вторым - уровень приближений карты, третьим - объект с опциями (из документации LeafLet)
    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: { duration: 1 },
    });

    // *
    // workout.click();
    // console.log(workout);
    // *
  }

  _addWorkoutsToLocalStorage() {
    // localStorage - это API, который предоставляется браузером
    // Первым параметром принимает название, вторым - строка, которая будет связана с ключом (workouts)
    // В локальном хранилище содержатся пары ключ-значение
    // JSON.stringify() преобразовывает значения в JSON строку
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    // ключ - workouts
    // значение -
    // {"date":"2023-09-02T18:49:08.949Z","id":"3680548949","clickNumber":0,"coords":[43.570130871698865,39.77042198181153],"distance":1,"duration":1,"type":"running","temp":1,"pace":1,"description":"Пробежка 02.09.2023"},{"date":"2023-09-02T18:51:05.782Z","id":"3680665782","clickNumber":0,"coords":[43.572245193194306,39.74952220916748],"distance":2,"duration":2,"type":"cycling","climb":2,"speed":60,"description":"Велотренировка 02.09.2023"}],
    // оно же:
    // [{date: "2023-09-02T18:49:08.949Z", id: "3680548949", clickNumber: 0,…},…]
    //   >
    //   0: {date: "2023-09-02T18:49:08.949Z", id: "3680548949", clickNumber: 0,…}
    //   1: {date: "2023-09-02T18:51:05.782Z", id: "3680665782", clickNumber: 0,…}

    // то есть, мы каждый раз добавляем через JSON.stringify(this.#workouts) в хранилище массив с JSON объектами, каждый из которых содержит все данные о своей тренировке

    // localStorage - очень простой API, его стоит использовать только для очень небольшого количества данных
    // localStorage является блокирующим (не очень хорошо, изучим чот это позже)
    // Хранение больших объемов данных в localstorage сильно замедлит приложение
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    // this.#workouts.forEach(workout => {
    //   this._displayWorkoutOnSidebar(workout);
    //   // Пример того, как удобно иметь логику, как в данном случае помещение тренировок на боковую панель, в отдельном методе. Теперь его можно использовать (вызывать) в любом месте приложения
    //   this._displayWorkout(workout); // Cannot read properties of undefined (reading 'addLayer') // Потому что карта еще не загружена, _getPosition() еще не завершен
    // });
    // Поэтому здесь оставляем этот код:
    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebar(workout);
    });
    // А этот код поместим в конце кода от LeafLet, чтобы он дожидался загрузки карты (в методе _loadMap())
    // this.#workouts.forEach(workout => {
    //   this._displayWorkout(workout);
    // });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  // а вызвать reset() можно в консоли, пишем app.reset()
}

const app = new App(); // сейчас нам не нужно передавать сюда для конструктора какие-либо параметры. Нередко бывает нужно, когда, напрмер, мы передаем параметры каких-то сторонних библиотек
// app._getPosition(); // здесь запускать не обязательно. Для чистоты кода запустим в конструкторе, так как конструктор запускается при загрузке страницы и создании объекта через const app = new App();

// **** когда мы паковали наши тренировки в строку для помещения в локальное хранилище (JSON) и потом парсили и преобразовывали в объект, объекты утратили прототипную цепь,
// теперь это не объекты, созданные при помощи Running или Cycling, это просто самостоятельные объекты JS
// и, как следствие, при клике на тренировку на боковой панели Uncaught TypeError: workout.click is not a function at App._moveToWorkout
// поэтому не унаследованы методы, в данном случае, click().
// Как вариант, мы могли бы из данных, которые мы получаем в _getLocalStorageData() из хранилища, создавать новые объекты при помощи Running и Cycling
// Но в приложении click() не требуется, поэтому просто его закомментим. Он был для примера работы API
// (можно дописать функционал click() и создать новые объекты как челлендж)
