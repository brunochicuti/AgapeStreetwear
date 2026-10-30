import Link from 'next/link';
import {Show, SignInButton, UserButton} from "@clerk/nextjs";
import Cart from './Cart';
function Navbar(){
    return(
    <nav className="fixed top-0 w-full flex items-center py-2 px-8 justify-between z-50 bg-black text-white border-b border-white/30 border-b-0.5">
        <Link href="/" 
            className="uppercase font-bold text-md h-12 flex items-center"
            >
          Agape Streetwear
        </Link>
        <div className='flex items-center gap-8'>
            <div className='flex items-center'>
                    <Cart/>
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