import Link from 'next/link';
import {Show, SignInButton, UserButton} from "@clerk/nextjs";
import { useCartStore } from '@/src/store';
function Navbar(){
    // const useStore = useCartStore();
    return(
    <nav className="fixed top-0 w-full flex items-center py-2 px-8 justify-between z-50 bg-black text-white border-b border-white/30 border-b-0.5">
        <Link href="/" 
            className="uppercase font-bold text-md h-12 flex items-center"
            >
          Agape Streetwear
        </Link>
        <div className='flex items-center gap-8'>
            <div className='flex items-center'>
                <button type="button"
                className="cursor-pointer flex items-center gap-3 bg-white px-5 py-3 text-black font-semibold uppercase tracking-wider text-sm hover:bg-gray-200 transition">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    >
                    <path d="M5.5 8h13l-1 12h-11l-1-12Z" />
                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                    </svg>
                    <span>Sacola (0)</span>
                 </button>
            </div>
            <div>
                 <Show when="signed-in">
                    <UserButton/>
                </Show>

                <Show when="signed-out">
                    <SignInButton mode='modal'>
                        <button className='border rounded-md border-gray-400 px-3 py-2'>
                        Fazer Login
                    </button>
                    </SignInButton>
                    </Show>
            </div>
        </div>
    </nav>
    )
}
export default Navbar;