import {createRouter, createWebHistory} from 'vue-router'
import Home from '../views/Home.vue'
import JoinChat from '../views/JoinChat.vue'
import ChatRoom from '../views/ChatRoom.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home,
        },
        {
            path: '/chat/:id',
            name: 'join-chat',
            component: JoinChat,
            props: true
        },
        {
            path: '/room/:id',
            name: 'chat-room',
            component: ChatRoom,
            props: true
        }
    ],
})

export default router
