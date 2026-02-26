from fastapi import FastAPI
from pydantic import BaseModel
from datetime import date

app = FastAPI()

expenses = []

class Expense(BaseModel):
    amount: float
    category: str
    description: str
    date: date


@app.get("/")
def read_root():
    return {"message": "Daily Expense Tracker"}


@app.post("/expenses")
def add_expense(expense: Expense):
    expenses.append(expense)
    return {"message": "Expense added successfully", "expense": expense}
 
@app.get("/expenses/", response_model=list[Expense])
def get_expenses():
    return expenses

@app.get("/expenses/total")
def get_total():
    total = sum(exp.amount for exp in expenses)
    return {"total_expense": total}

@app.get("/expenses/{expense_date}")
def get_expenses_by_date(expense_date: date):
    expense = [exp for exp in expenses if exp.date == expense_date]
    return expense