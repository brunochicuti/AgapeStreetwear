import Link from 'next/link';
function Navbar(){
    return(
    <nav className="fixed top-0 w-full flex items-center py-2 px-8 justify-between z-50 bg-black text-white border-b border-white/30 border-b-0.5">
        <Link href="/" 
            className="uppercase font-bold text-md h-12 flex items-center"
            >
          Agape Streetwear
        </Link>
    </nav>
    )
}
export default Navbar;