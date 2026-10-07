# GoodCopyCF

Расширение для Chrome и Firefox, которое исправляет копирование на Codeforces.
Без него формулы теряют структуру: `p/q` копируется как `pq`, `10^4` — как `104`.
С ним обычное Ctrl+C кладёт в буфер текст с формулами в LaTeX:

```
дробь $\frac{p}{q}$ равна **по значению** дроби $\frac{2}{3}$ ($1 \le t \le 10^4$)
```

Расширение работает только на codeforces.com, не требует прав и ничего не
отправляет в сеть.

## Установка из исходников

**Chrome:** открыть `chrome://extensions`, включить «Режим разработчика»,
нажать «Загрузить распакованное расширение» и выбрать папку проекта.

**Firefox:** открыть `about:debugging#/runtime/this-firefox`, нажать
«Загрузить временное дополнение» и выбрать `manifest.json`. Временное
дополнение пропадает после перезапуска браузера; для постоянной установки
нужна публикация на addons.mozilla.org.

## Разработка

```
npm install
npm test        # тесты
npm run build   # dist/goodcopycf-<версия>.zip
```

## Публикация

Архив из `dist/` подходит обоим магазинам.

- Firefox: <https://addons.mozilla.org/developers/> — бесплатно.
- Chrome: <https://chrome.google.com/webstore/devconsole> — разовый взнос $5.

Перед новой публикацией поднять `version` в `manifest.json` и `package.json`.

## Лицензия

[MIT](LICENSE)
