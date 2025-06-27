import firebase_admin
from firebase_admin import credentials, db
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
import os

# 🔐 Load your Telegram Bot token from environment variable (set in Railway)
BOT_TOKEN = os.environ.get("BOT_TOKEN")

# 🔐 Firebase Setup
cred = credentials.Certificate("firebase_key.json")  # your Firebase JSON file
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://telegram-chat-bot-be875-default-rtdb.firebaseio.com/'  # ← Replace this with your actual Firebase Realtime DB URL
})

waiting_ref = db.reference('waiting')
chats_ref = db.reference('active_chats')


# ✅ /start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 Welcome to Live Chat Bot!\n\nType /chat to connect with someone.\nType /stop to leave chat.")

# ✅ /chat command
async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)

    if chats_ref.child(user_id).get():
        await update.message.reply_text("⚠️ You're already in a chat.")
        return

    waiting_user = waiting_ref.get()
    if waiting_user and waiting_user != user_id:
        # Match users
        waiting_ref.delete()
        chats_ref.child(user_id).set(waiting_user)
        chats_ref.child(waiting_user).set(user_id)
        await context.bot.send_message(chat_id=int(waiting_user), text="🎉 You are now connected! Say hi 👋")
        await update.message.reply_text("🎉 You are now connected! Say hi 👋")
    else:
        waiting_ref.set(user_id)
        await update.message.reply_text("⏳ Waiting for someone to join...")

# ✅ /stop command
async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    partner_id = chats_ref.child(user_id).get()

    if partner_id:
        chats_ref.child(partner_id).delete()
        chats_ref.child(user_id).delete()
        await context.bot.send_message(chat_id=int(partner_id), text="❌ Your partner left the chat.")
        await update.message.reply_text("✅ You left the chat.")
    else:
        await update.message.reply_text("❌ You're not in a chat.")

# ✅ Message forwarding
async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    partner_id = chats_ref.child(user_id).get()

    if partner_id:
        await context.bot.send_message(chat_id=int(partner_id), text=update.message.text)
    else:
        await update.message.reply_text("❗You're not in a chat. Type /chat to find someone.")

# 🚀 Bot startup
app = ApplicationBuilder().token(BOT_TOKEN).build()

app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("chat", chat))
app.add_handler(CommandHandler("stop", stop))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, forward_message))

app.run_polling()
