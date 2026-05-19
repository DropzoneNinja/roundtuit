.PHONY: dev prod migrate seed logs down

dev:
	docker compose up --build

prod:
	docker compose -f docker-compose.prod.yml up -d --build

migrate:
	docker compose exec backend npx prisma migrate dev

seed:
	docker compose exec backend npx prisma db seed

logs:
	docker compose logs -f

down:
	docker compose down
