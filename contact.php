<?php

if($_POST) {
    $recipient = "wray@wraycrawford.com";
    $visitor_name = "";
    $visitor_email = "";
    $message_subject = "";
    $where_did_you_hear = "";
    $visitor_message = "";
    $other = "";
    $referral_name = "";
    $email_body = "<div>";

    if(isset($_POST['visitor_name'])) {
        $visitor_name = filter_var($_POST['visitor_name'], FILTER_SANITIZE_STRING);
        $email_body .= "<div>
<label><b>Visitor Name:</b></label>&nbsp;<span>".$visitor_name."</span>
</div>";
    }
    if(isset($_POST['visitor_email'])) {
        $visitor_email = str_replace(array("\r", "\n", "%0a", "%0d"), '', $_POST['visitor_email']);
        $visitor_email = filter_var($visitor_email, FILTER_VALIDATE_EMAIL);
        $email_body .= "<div>
<label><b>Visitor Email:</b></label>&nbsp;<span>".$visitor_email."</span>
</div>";
    }

    if(isset($_POST['message_subject'])) {
        $message_subject = filter_var($_POST['message_subject'], FILTER_SANITIZE_STRING);
        $email_body .= "<div>
<label><b>Message Subject:</b></label>&nbsp;<span>".$message_subject."</span>
</div>";
    }

    if(isset($_POST['visitor_message'])) {
        $visitor_message = htmlspecialchars($_POST['visitor_message']);
        $email_body .= "<div>
<label><b>Visitor Message:</b></label>
<div>".$visitor_message."</div>
</div>";
    }

    $email_body .= "</div>";
    $headers  = 'MIME-Version: 1.0' . "\r\n"
    .'Content-type: text/html; charset=utf-8' . "\r\n"
    .'From: ' . $visitor_email . "\r\n";

    if(mail($recipient, $message_subject, $email_body, $headers)) {
        echo '
        <!DOCTYPE HTML>
        <html lang="en-US">
        
        <!-- Begin Head -->
        <head>

    <meta charset="utf-8">
    <title>Wray Crawford Actor</title>

    <!-- Begin Meta Tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="Wray Crawford SAG/AFTRA Actor"/>
    <meta name="keywords" content="HTML, CSS, JavaScript, Responsive, Actor, Acting, Dramatic"/>
    <meta name="author" content="WrayCrawford"/>
    <!-- End Meta Tags -->

    <link rel="icon" href="images/theatermasks.png" />

    <!-- Begin Stylesheets -->
    <link type="text/css" rel="stylesheet" href="css/reset.css">
    <link type="text/css" rel="stylesheet" href="includes/fontawesome/icons.css">
    <link type="text/css" rel="stylesheet" href="js/custom-scrollbar/custom-scrollbar.css">
    <link type="text/css" rel="stylesheet" href="js/magnific-popup/magnific-popup.css">
    <link type="text/css" rel="stylesheet" href="js/flexslider/flexslider.css">
    <link type="text/css" rel="stylesheet" href="js/kenburns/kenburns.css">
    <link type="text/css" rel="stylesheet" href="js/swiper/swiper.css">
    <link type="text/css" rel="stylesheet" href="css/styles.css">
    <link type="text/css" rel="stylesheet" href="css/light.css">
    <!-- End Stylesheets -->

</head>
        <!-- End Head -->
        
        
        <!-- Begin Body -->
        <body>
        
            <!-- Begin Loader -->
            <div class="preloader">
                <p>LOADING</p>
                <span class="circle"></span>
            </div>
            <!-- End Loader -->
        
            <!-- Begin Header -->
            <header>
        
                <!-- Begin Logo -->
                <div class="logo">
                    <a href="index.html">
                        <img src="images/ActorLogo_page_logo.png" alt="">
                    </a>
                </div>
                <!-- End Logo -->
        
                <!-- Begin Mobile Nav Icon -->
                <span class="menu-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <!-- End Mobile Nav Icon -->
        
                <!-- Begin Navigation -->
                <nav>
                    <ul>
        
                        <li>
                            <a href="about.html">About</a>
                        </li>
        
                        <li>
                            <a href="resume.html">Resume</a>
                        </li>
        
                        <li>
                            <a href="gallery.html">Gallery</a>
                        </li>
        
                        <li>
                            <a href="videos.html">Videos</a>
                        </li>
        
                        <li>
                            <a href="contact.html" class="active">Contact</a>
                        </li>
        
                    </ul>
                </nav>
                <!-- End Navigation -->
        
            </header>
            <!-- End Header -->
        
            <!-- Begin Main -->
            <main class="page extra-padding">
                <div class="inner-container">
        
                    <h1 class="page-header">Thank you so much for reaching out</h1>
       
                    <p>Click <a href="index.html" style="color:#29abe2">here</a> return to the homepage.</p>
        
                    <span class="divider20"></span>
        
                </div>
            </main>
            <!-- End Main -->
            
           <!-- Begin Footer -->
            <footer>
        
                <div class="copyrights">
                    <p>©2023 Wray Crawford</p>
                </div>
        
                <div class="social-links">
                    <ul>
                        <li><a href="https://https://www.facebook.com/thewraycrawford/" class="icons-facebook"></a></li>
                        <li><a href="https://https://www.instagram.com/the_wraycrawford/" class="icons-instagram"></a></li>
                        <li><a href="https://www.youtube.com/channel/UCHzQdVeqZU-8nsNXwnO8Gqw" class="icons-youtube-play"></a></li>
                    </ul>
                </div>
        
            </footer>
            <!-- End Footer -->

        
            <!-- Begin JavaScript -->
            <script src="js/jquery.js"></script>
            <script src="js/modernizr.js"></script>
            <script src="js/easing.js"></script>
            <script src="js/imagesloaded.js"></script>
            <script src="js/fitvids.js"></script>
            <script src="js/yt-player.js"></script>
            <script src="js/appear.js"></script>
            <script src="js/magnific-popup/magnific-popup.js"></script>
            <script src="js/custom-scrollbar/custom-scrollbar.js"></script>
            <script src="js/flexslider/flexslider.js"></script>
            <script src="js/kenburns/kenburns.js"></script>
            <script src="js/swiper/swiper.js"></script>
            <script src="js/isotope.js"></script>
            <script src="js/scripts.js"></script>
            <!-- End JavaScript -->
        
        
        </body>
        <!-- End Body -->
        
        </html>
        
        ';
    }

} else {
    echo '
    
    <!DOCTYPE HTML>
        <html lang="en-US">
        
        <!-- Begin Head -->
        <head>

    <meta charset="utf-8">
    <title>Wray Crawford Actor</title>

    <!-- Begin Meta Tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="Wray Crawford SAG/AFTRA Actor"/>
    <meta name="keywords" content="HTML, CSS, JavaScript, Responsive, Actor, Acting, Dramatic"/>
    <meta name="author" content="WrayCrawford"/>
    <!-- End Meta Tags -->

    <link rel="icon" href="images/theatermasks.png" />

    <!-- Begin Stylesheets -->
    <link type="text/css" rel="stylesheet" href="css/reset.css">
    <link type="text/css" rel="stylesheet" href="includes/fontawesome/icons.css">
    <link type="text/css" rel="stylesheet" href="js/custom-scrollbar/custom-scrollbar.css">
    <link type="text/css" rel="stylesheet" href="js/magnific-popup/magnific-popup.css">
    <link type="text/css" rel="stylesheet" href="js/flexslider/flexslider.css">
    <link type="text/css" rel="stylesheet" href="js/kenburns/kenburns.css">
    <link type="text/css" rel="stylesheet" href="js/swiper/swiper.css">
    <link type="text/css" rel="stylesheet" href="css/styles.css">
    <link type="text/css" rel="stylesheet" href="css/light.css">
    <!-- End Stylesheets -->

</head>
        <!-- End Head -->
        
        
        <!-- Begin Body -->
        <body>
        
            <!-- Begin Loader -->
            <div class="preloader">
                <p>LOADING</p>
                <span class="circle"></span>
            </div>
            <!-- End Loader -->
        
            <!-- Begin Header -->
            <header>
        
                <!-- Begin Logo -->
                <div class="logo">
                    <a href="index.html">
                        <img src="images/ActorLogo_page_logo.png" alt="">
                    </a>
                </div>
                <!-- End Logo -->
        
                <!-- Begin Mobile Nav Icon -->
                <span class="menu-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <!-- End Mobile Nav Icon -->
        
                <!-- Begin Navigation -->
                <nav>
                    <ul>
        
                        <li>
                            <a href="about.html">About</a>
                        </li>
        
                        <li>
                            <a href="resume.html">Resume</a>
                        </li>
        
                        <li>
                            <a href="gallery.html">Gallery</a>
                        </li>
        
                        <li>
                            <a href="videos.html">Videos</a>
                        </li>
        
                        <li>
                            <a href="contact.html" class="active">Contact</a>
                        </li>
        
                    </ul>
                </nav>
                <!-- End Navigation -->
        
            </header>
            <!-- End Header -->
            
            <!-- Begin Main -->
            <main class="page extra-padding">
                <div class="inner-container">
        
                    <h1 class="page-header">Oops...something went wrong</h1>
        
                    <p>Please email me with the information you provided at <a style="color:#29abe2"; href="mailto:wray@wraycrawford.com">wray@wraycrawford.com</a></a></p>
                    
                    <p>return to the <a style="color:#29abe2"; href="index.html">homepage</a></p>
        
                    <span class="divider20"></span>
        
                </div>
            </main>
            <!-- End Main -->
            <!-- Begin Footer -->
            <footer>
        
                <div class="copyrights">
                    <p>©2023 Wray Crawford</p>
                </div>
        
                <div class="social-links">
                    <ul>
                        <li><a href="https://https://www.facebook.com/thewraycrawford/" class="icons-facebook"></a></li>
                        <li><a href="https://https://www.instagram.com/the_wraycrawford/" class="icons-instagram"></a></li>
                        <li><a href="https://www.youtube.com/channel/UCHzQdVeqZU-8nsNXwnO8Gqw" class="icons-youtube-play"></a></li>
                    </ul>
                </div>
        
            </footer>
            <!-- End Footer -->
        
            <!-- Begin JavaScript -->
            <script src="js/jquery.js"></script>
            <script src="js/modernizr.js"></script>
            <script src="js/easing.js"></script>
            <script src="js/imagesloaded.js"></script>
            <script src="js/fitvids.js"></script>
            <script src="js/yt-player.js"></script>
            <script src="js/appear.js"></script>
            <script src="js/magnific-popup/magnific-popup.js"></script>
            <script src="js/custom-scrollbar/custom-scrollbar.js"></script>
            <script src="js/flexslider/flexslider.js"></script>
            <script src="js/kenburns/kenburns.js"></script>
            <script src="js/swiper/swiper.js"></script>
            <script src="js/isotope.js"></script>
            <script src="js/scripts.js"></script>
            <!-- End JavaScript -->
        
       
        </body>
        <!-- End Body -->
        
        </html>
        
        ';
}
?>