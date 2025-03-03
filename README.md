###Практика 1 по nodeJS, Брызгалин Иван

Gateway: Точка входа.
Units: Управление юнитами.
FileStorage: Загрузка и хранение файлов.
Log: Централизованное логирование.

##Запуск сервиса

node run-all.js

Gateway будет доступен по адресу: http://localhost:3000.

###Доступные эндпоинты

##Юниты
#Создание юнита:
curl -X POST http://localhost:3000/units \
-H "Content-Type: application/json" \
-d '{"name": "Unit 1", "image": "image1.jpg"}'

#Получение списка юнитов:
curl http://localhost:3000/units

#Получение юнита по ID
curl http://localhost:3000/units/1

#Обновление юнита
curl -X PUT http://localhost:3000/units/1 \
-H "Content-Type: application/json" \
-d '{"name": "Updated Unit 1", "image": "updated_image1.jpg"}'

#Удаление юнита
curl -X DELETE http://localhost:3000/units/1
##Работа с файлами
#Загрузка файла
curl -X POST http://localhost:3000/upload \
-F "file=@/path/to/your/file.jpg"

#Получение файла
curl http://localhost:3000/files/12345-file.jpg

##Работа с логами
#Получение списка логов
curl http://localhost:3000/logs

##Корневой маршрут
#Получение информации о Gateway
curl http://localhost:3000/

